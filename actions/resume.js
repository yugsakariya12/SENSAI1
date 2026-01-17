"use server";

import { auth } from "@clerk/nextjs/server";
import { getDB } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";

// GROQ client (OpenAI compatible)
const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // gsk-...
  baseURL: "https://api.groq.com/openai/v1",
});

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const db = await getDB();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: { userId: user.id },
      update: { content },
      create: { userId: user.id, content },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const db = await getDB();

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: { userId: user.id },
  });
}

export async function improveWithAI({ current, type }) {
  const prompt = `
As a professional resume writer, rewrite the following ${type} bullet point.
Make it concise, achievement-based, quantifiable, and action-verb driven.

Current:
"${current}"

Output only the improved line.
`;

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const improved = resp.choices[0].message.content.trim();
    return improved;
  } catch (err) {
    console.error("Error improving resume:", err);
    throw new Error("Failed to improve content");
  }
}
