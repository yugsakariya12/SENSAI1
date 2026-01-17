

import { inngest } from "./client";
import { getDB } from "@/lib/prisma";
import OpenAI from "openai";

const db = getDB();

// GROQ CLIENT (OpenAI compatible)
const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// normalize for Prisma schema safety
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

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Weekly Industry Insights" },
  { cron: "0 0 * * 0" }, // every Sunday at midnight
  async ({ step }) => {
    // Fetch industries from DB
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    // Loop through each industry
    for (const { industry } of industries) {
      const prompt = `
Analyze the current state of the ${industry} industry and return ONLY valid JSON:

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
- no commentary
- no backticks
- at least 5 roles, 5 skills, 5 trends
`;

      const completion = await step.run(
        `Generate insights for ${industry}`,
        async () => {
          return await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.1,
            messages: [{ role: "user", content: prompt }],
          });
        }
      );

      const raw = completion?.choices?.[0]?.message?.content || "";
      console.log("GROQ RAW OUTPUT:", raw);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        console.warn(`Failed to parse JSON for ${industry}:`, err);
        parsed = {};
      }

      const normalized = normalizeInsights(parsed);

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...normalized,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    }

    return { updated: industries.length };
  }
);
