import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";


import { generateIndustryInsights } from "@/lib/inngest/functions";
export const runtime = "nodejs"; // or "edge"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    
    generateIndustryInsights, // 👈 added weekly cron job
  ],
});
