import { getAiConfig } from "@/config/ai";
import { getAirtableMcpConfig } from "@/config/airtable";
import { openai } from "@/integrations/ai/client";
import { Email } from "@/shared/types";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { JOB_RECORD_RESOLUTION_SYSTEM_PROMPT } from "./prompts";
import { jobRecordResolutionSchema } from "./schemas";

const { defaultModel, classification } = getAiConfig();

type JobRecordResolution = z.infer<typeof jobRecordResolutionSchema>;
type JobRecordResolutionInput = Pick<
  Email,
  "subject" | "sender_name" | "sender_address" | "body" | "body_preview" | "status"
>;

export async function resolveJobRecord(
  email: JobRecordResolutionInput
): Promise<JobRecordResolution> {
  if (
    email.status !== "rejection" &&
    email.status !== "assessment" &&
    email.status !== "interview_invitation" &&
    email.status !== "generic_update"
  ) {
    throw new Error(
      `Job record resolution requires an actionable email status. Received: ${email.status ?? "(none)"}`
    );
  }

  const { serverUrl, allowedTools, requireApproval, authorization } = getAirtableMcpConfig();

  const response = await openai.responses.parse({
    model: defaultModel,
    temperature: classification.temperature,
    instructions: JOB_RECORD_RESOLUTION_SYSTEM_PROMPT,
    input: JSON.stringify(email),
    tools: [
      {
        type: "mcp",
        server_label: "airtable",
        server_url: serverUrl,
        allowed_tools: allowedTools,
        require_approval: requireApproval === "always" ? "always" : "never",
        authorization
      },
    ],
    text: {
      format: zodTextFormat(jobRecordResolutionSchema, "job_record_resolution"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Job record resolver returned no structured output.");
  }

  console.log(response.output_parsed)

  return response.output_parsed;
}
