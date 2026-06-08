import { getAirtableMcpConfig } from "@/config/airtable";
import {
  ClassifiedEmailRelevance,
  ClassifiedEmailStatus,
  Email,
  JobRecordResolution,
  JobRecordResolutionInput,
} from "@/shared/types";
import {
  buildClassificationPrompt,
  parseStructuredOutput,
} from "./helpers";
import {
  JOB_RECORD_RESOLUTION_SYSTEM_PROMPT,
  RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT,
  STATUS_CLASSIFICATION_SYSTEM_PROMPT,
} from "./prompts";
import {
  jobRecordResolutionSchema,
  relevanceSchema,
  statusSchema,
} from "./schemas";

export async function classifyEmailStatus(
  email: Email
): Promise<ClassifiedEmailStatus> {
  const outputParsed = await parseStructuredOutput({
    systemPrompt: STATUS_CLASSIFICATION_SYSTEM_PROMPT,
    userInput: buildClassificationPrompt(email),
    schema: statusSchema,
    schemaName: "email_status",
    errorMessage: "Email status classification returned no structured output.",
  });

  return {
    email,
    status: outputParsed,
  };
}

export async function classifyEmailRelevance(
  email: Email
): Promise<ClassifiedEmailRelevance> {
  const outputParsed = await parseStructuredOutput({
    systemPrompt: RELEVANCE_CLASSIFICATION_SYSTEM_PROMPT,
    userInput: buildClassificationPrompt(email),
    schema: relevanceSchema,
    schemaName: "email_relevance",
    errorMessage:
      "Email relevance classification returned no structured output.",
  });

  return {
    email,
    relevance: outputParsed,
  };
}

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

  const { serverUrl, allowedTools, requireApproval, authorization } =
  getAirtableMcpConfig();

  return parseStructuredOutput({
    systemPrompt: JOB_RECORD_RESOLUTION_SYSTEM_PROMPT,
    userInput: JSON.stringify(email),
    schema: jobRecordResolutionSchema,
    schemaName: "job_record_resolution",
    errorMessage: "Job record resolver returned no structured output.",
    tools: [
      {
        type: "mcp",
        server_label: "airtable",
        server_url: serverUrl,
        allowed_tools: allowedTools,
        require_approval: requireApproval === "always" ? "always" : "never",
        authorization,
      },
    ],
  });
}
