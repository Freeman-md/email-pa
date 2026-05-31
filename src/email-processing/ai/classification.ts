import { getAiConfig } from "@/config/ai";
import { ClassifiedEmailRelevance, ClassifiedEmailStatus, EmailRelevanceClassification, EmailStatusClassification, Email } from "../types";
import { openai } from "@/integrations/ai/client";
import { zodTextFormat } from "openai/helpers/zod";
import { relevanceSchema, statusSchema } from "./schemas";
import { RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT, STATUS_CLASSIFICATION_SYSTEM_PROMPT } from "./prompts";

const { defaultModel, classification } = getAiConfig();

function buildPrompt(email: Email) {
  const lines = [
    `Subject: ${email.Subject || "(none)"}`,
    `Sender Name: ${email["Sender Name"] || "(unknown)"}`,
    `Sender Address: ${email["Sender Address"] || "(unknown)"}`,
    `Received At: ${email["Received At"] || "(unknown)"}`,
    `Body Preview: ${email["Body Preview"] || "(none)"}`,
  ];

  if (email.Body) {
    lines.push(`Full Body: ${email.Body}`);
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
