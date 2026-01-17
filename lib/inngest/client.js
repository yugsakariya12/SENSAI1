import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "sensai-app",
  name: "Sensai AI",
  credentials: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY, // your Groq key
      baseURL: "https://api.groq.com/openai/v1",
    },
  },
});
