import { getAiConfig } from "@/config/ai";
import { openai } from "@/integrations/ai/client";
import { Email, ResponseParseOptions } from "@/shared/types";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const { defaultModel, classification } = getAiConfig();

export function buildClassificationPrompt(email: Email) {
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

export function requireParsedOutput<T>(
  outputParsed: T | null,
  errorMessage: string
): T {
  if (!outputParsed) {
    throw new Error(errorMessage);
  }

  return outputParsed;
}

export async function parseStructuredOutput<T>({
  systemPrompt,
  userInput,
  schema,
  schemaName,
  errorMessage,
  tools,
}: {
  systemPrompt: string;
  userInput: string;
  schema: z.ZodType<T>;
  schemaName: string;
  errorMessage: string;
  tools?: ResponseParseOptions["tools"];
}): Promise<T> {
  const request: ResponseParseOptions = {
    model: defaultModel,
    temperature: classification.temperature,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userInput,
      },
    ],
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  };

  if (tools) {
    request.tools = tools;
  }

  const response = await openai.responses.parse(request);

  return requireParsedOutput(response.output_parsed as T | null, errorMessage);
}
