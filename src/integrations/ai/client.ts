import { getAiConfig } from "@/config/ai";
import OpenAI from "openai";

const { apiKey } = getAiConfig();

export const openai = new OpenAI({
  apiKey,
  maxRetries: 0,
});
