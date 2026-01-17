import "dotenv/config";  // <-- load env automatically
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

async function listModels() {
  try {
    const result = await groq.models.list();
    console.log("AVAILABLE MODELS:", result.data.map(m => m.id));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

listModels();
