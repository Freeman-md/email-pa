import { getAiConfig } from "@/config/ai";
import { ClassifiedEmailRelevance, ClassifiedEmailStatus, EmailRelevanceClassification, EmailStatusClassification, NormalizedEmail } from "../types";
import { generateText, Output } from "ai";
import { relevanceSchema, statusSchema } from "./schemas";
import { RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT, STATUS_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts";

function buildPrompt(email: NormalizedEmail) {
  const lines = [
    `Subject: ${email.subject || "(none)"}`,
    `Sender Name: ${email.senderName || "(unknown)"}`,
    `Sender Address: ${email.senderAddress || "(unknown)"}`,
    `Received At: ${email.receivedAt || "(unknown)"}`,
    `Body Preview: ${email.bodyPreview || "(none)"}`,
  ];

  if (email.body) {
    lines.push(`Full Body: ${email.body}`);
  }

  return lines.join("\n");
}

export async function classifyEmailStatus(
  email: NormalizedEmail
): Promise<ClassifiedEmailStatus> {
  const { classification } = getAiConfig();

  const result = await generateText({
    model: classification.model,
    temperature: classification.temperature,
    maxOutputTokens: classification.maxOutputTokens,
    system: STATUS_CLASSIFICATION_SYSTEM_PROMPT,
    prompt: buildPrompt(email),
    output: Output.object({
      schema: statusSchema,
    }),
  });

  return {
    email,
    status: result.output as EmailStatusClassification,
  };
}

export async function classifyEmailRelevance(
    email: NormalizedEmail
): Promise<ClassifiedEmailRelevance> {
    const { classification } = getAiConfig();

    const result = await generateText({
        model: classification.model,
        temperature: classification.temperature,
        maxOutputTokens: classification.maxOutputTokens,
        system: RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT,
        prompt: buildPrompt(email),
        output: Output.object({
            schema: relevanceSchema,
        }),
    });

    return {
        email,
        relevance: result.output as EmailRelevanceClassification,
    };
}
