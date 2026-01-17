import { getDB } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

// GROQ API (OpenAI compatible)
const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateQuiz() {
  const db = getDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true, skills: true },
  });

  if (!user) throw new Error("User not found");

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

export async function saveQuizResult(questions, answers, score) {
  const db = getDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

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
          `Q: "${q.question}" | Correct: "${q.answer}" | User: "${q.userAnswer}"`
      )
      .join("\n");

    const improvPrompt = `
User got these ${user.industry} technical interview questions wrong:

${wrongText}

Give 1–2 sentences of constructive improvement advice.
Don't mention specific mistakes. Encourage learning.
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
      improvementTip,
    },
  });

  return assessment;
}

export async function getAssessments() {
  const db = getDB();
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.assessment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
}
