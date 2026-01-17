"use server";

import OpenAI from "openai";
import { getDB } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// GROQ client via OpenAI wrapper
const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// normalize to Prisma schema
function normalizeInsights(json = {}) {
  return {
    salaryRanges: Array.isArray(json.salaryRanges) ? json.salaryRanges : [],
    growthRate: typeof json.growthRate === "number" ? json.growthRate : 0,
    demandLevel:
      ["High", "Medium", "Low"].includes(json.demandLevel)
        ? json.demandLevel
        : "Medium",
    topSkills: Array.isArray(json.topSkills) ? json.topSkills : [],
    marketOutlook:
      ["Positive", "Neutral", "Negative"].includes(json.marketOutlook)
        ? json.marketOutlook
        : "Neutral",
    keyTrends: Array.isArray(json.keyTrends) ? json.keyTrends : [],
    recommendedSkills: Array.isArray(json.recommendedSkills)
      ? json.recommendedSkills
      : [],
  };
}

export const generateAIInsights = async (industry) => {
  const prompt = `
Analyze the ${industry} industry and return ONLY valid JSON with:

{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
  ],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["trend1", "trend2"],
  "recommendedSkills": ["skill1", "skill2"]
}

RULES:
- JSON only
- no markdown
- no backticks
- no commentary
- 5 roles minimum
- 5 skills minimum
- 5 trends minimum
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
  });

  const text = response?.choices?.[0]?.message?.content || "";

  console.log("🟡 RAW LLAMA OUTPUT:", text);

  try {
    const parsed = JSON.parse(text);
    const normalized = normalizeInsights(parsed);
    console.log("🟢 NORMALIZED INSIGHTS:", normalized);
    return normalized;
  } catch (err) {
    console.warn("⚠️ JSON parse failed — using fallback", err);
    const fallback = normalizeInsights({});
    console.log("🟩 FALLBACK INSIGHTS:", fallback);
    return fallback;
  }
};

export async function getIndustryInsights() {
  const db = getDB();
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    return await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return user.industryInsight;
}
