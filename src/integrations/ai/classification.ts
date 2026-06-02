import { getAiConfig } from "@/config/ai";
import { ClassifiedEmailRelevance, ClassifiedEmailStatus, EmailRelevanceClassification, EmailStatusClassification, Email } from "@/shared/types";
import { openai } from "@/integrations/ai/client";
import { zodTextFormat } from "openai/helpers/zod";
import { relevanceSchema, statusSchema } from "./schemas";
import { RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT, STATUS_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts";

const { defaultModel, classification } = getAiConfig();

function buildPrompt(email: Email) {
  const lines = [
    `Subject: ${email.subject || "(none)"}`,
    `Sender Name: ${email.sender_name || "(unknown)"}`,
    `Sender Address: ${email.sender_address || "(unknown)"}`,
    `Received At: ${email.received_at || "(unknown)"}`,
    `Body Preview: ${email.body_preview || "(none)"}`,
  ];

  if (email.body) {
    lines.push(`Full Body: ${email.body}`);
  }

  return lines.join("\n");
}

export async function classifyEmailStatus(
  email: Email
): Promise<ClassifiedEmailStatus> {
  const response = await openai.responses.parse({
    model: defaultModel,
    temperature: classification.temperature,
    input: [
      {
        role: "system",
        content: STATUS_CLASSIFICATION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildPrompt(email),
      },
    ],
    text: {
      format: zodTextFormat(statusSchema, "email_status"),
    },
  });

  return {
    email,
    status: response.output_parsed as EmailStatusClassification,
  };
}

export async function classifyEmailRelevance(
  email: Email
): Promise<ClassifiedEmailRelevance> {
  const response = await openai.responses.parse({
    model: defaultModel,
    temperature: classification.temperature,
    input: [
      {
        role: "system",
        content: RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildPrompt(email),
      },
    ],
    text: {
      format: zodTextFormat(relevanceSchema, "email_relevance"),
    },
  });

  return {
    email,
    relevance: response.output_parsed as EmailRelevanceClassification,
  };
}
