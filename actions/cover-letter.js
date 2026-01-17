"use server";

import { auth } from "@clerk/nextjs/server";
import { getDB } from "@/lib/prisma";
import OpenAI from "openai";

// GROQ (OpenAI-compatible)
const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateCoverLetter({ jobTitle, companyName, jobDescription }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const db = await getDB();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
Write a polished cover letter for a **${jobTitle}** role at **${companyName}**.

Candidate Profile:
• Industry: ${user.industry || "Not provided"}
• Experience: ${user.experience || "Not provided"} years
• Skills: ${user.skills?.join(", ") || "Not provided"}
• Summary: ${user.bio || "Not provided"}

Job Description:
${jobDescription}

Formatting + Requirements:
1. Use business letter formatting in **markdown**
2. Professional but enthusiastic tone
3. Reference skills → job requirements connection
4. Max 400 words
5. Include 1–2 quantifiable achievements if possible
6. NO hallucination. Only use provided info
7. End with a short closing paragraph & thank you
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0].message.content.trim();

    const saved = await db.coverLetter.create({
      data: {
        content,
        jobTitle,
        companyName,
        jobDescription,
        status: "completed",
        userId: user.id,
      },
    });

    return saved;

  } catch (err) {
    console.error("CoverLetter Error:", err);
    throw new Error("Failed to generate cover letter");
  }
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const db = await getDB();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const db = await getDB();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const db = await getDB();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
