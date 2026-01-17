import Quiz from "../_components/quiz";
import { auth } from "@clerk/nextjs/server";
import { getDB } from "@/lib/prisma";
import OpenAI from "openai";

export async function generateQuizAction() {
  "use server";

  const db = getDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true, skills: true },
  });

  if (!user) throw new Error("User not found");

  const groq = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const prompt = `
Generate 10 technical interview questions for a ${user.industry} professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.

Each must be multiple choice with 4 options.

Return ONLY valid JSON like:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
No commentary. No Markdown. No backticks.
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = completion.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);

  return parsed.questions;
}

export async function saveQuizAction(questions, answers, score) {
  "use server";

  const db = getDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const groq = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const questionResults = questions.map((q, i) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[i],
    isCorrect: q.correctAnswer === answers[i],
    explanation: q.explanation,
  }));

  const wrong = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;

  if (wrong.length > 0) {
    const wrongText = wrong
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect: "${q.answer}"\nUser: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvPrompt = `
User got the following ${user.industry} technical questions wrong:

${wrongText}

Provide a concise 1-2 sentence improvement tip based on skill gaps.
Do not mention the errors directly.
Be constructive and helpful.
`;

    const improv = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [{ role: "user", content: improvPrompt }],
    });

    improvementTip = improv.choices[0].message.content.trim();
  }

  const assessment = await db.assessment.create({
    data: {
      userId: user.id,
      quizScore: score,
      questions: questionResults,
      category: "Technical",
      improvementTip, // IMPORTANT: preserved
    },
  });

  return assessment;
}

export default function MockInterviewPage() {
  return (
    <Quiz generateQuiz={generateQuizAction} saveQuiz={saveQuizAction} />
  );
}
