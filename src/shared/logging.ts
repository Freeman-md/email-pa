import { Email, GraphEmail } from "./types";

export function logRunEvent(
  eventType: "started" | "emails_fetched" | "emails_processed" | "finished",
  {
    runId,
    windowStart,
    count,
    finishedAt,
  }: {
    runId: string;
    windowStart?: Date;
    count?: number;
    finishedAt?: Date;
  }
) {
  console.log("Run event", {
    eventType,
    runId,
    windowStart: windowStart?.toISOString(),
    count,
    finishedAt: finishedAt?.toISOString(),
  });
}

export function logRunFailureEvent(error: string) {
  console.error("Run failure event", {
    error,
  });
}

export function logEmailEvent(
  eventType:
    | "processing_started"
    | "record_ready"
    | "relevance_classified"
    | "status_classified"
    | "marked_read",
  messageId: string
) {
  console.log("Email event", {
    eventType,
    messageId,
  });
}

export function logEmailFailureEvent(
  eventType: "mark_read_failed" | "rolling_back" | "retrying",
  {
    messageId,
    error,
    attempt,
    maxRetries,
  }: {
    messageId: string;
    error?: string;
    attempt?: number;
    maxRetries?: number;
  }
) {
  console.warn("Email failure event", {
    eventType,
    messageId,
    error,
    attempt,
    maxRetries,
  });
}

export function buildRunSummaryMessage({
  runId,
  processedEmails,
  unprocessedEmails,
}: {
  runId: string;
  processedEmails: Email[];
  unprocessedEmails: GraphEmail[];
}) {
  const irrelevantCount = processedEmails.filter(
    (email) => email.status === "irrelevant"
  ).length;

  const rejectionCount = processedEmails.filter(
    (email) => email.status === "rejection"
  ).length;

  const interviewInvitationCount = processedEmails.filter(
    (email) => email.status === "interview_invitation"
  ).length;

  const assessmentCount = processedEmails.filter(
    (email) => email.status === "assessment"
  ).length;

  const genericUpdateCount = processedEmails.filter(
    (email) => email.status === "generic_update"
  ).length;

  return [
    "Job Email Run",
    "",
    `Run ID: ${runId}`,
    `Processed: ${processedEmails.length}`,
    `Unprocessed: ${unprocessedEmails.length}`,
    "",
    "Relevance",
    `- Irrelevant: ${irrelevantCount}`,
    "",
    "Status",
    `- Rejections: ${rejectionCount}`,
    `- Interviews: ${interviewInvitationCount}`,
    `- Assessments: ${assessmentCount}`,
    `- Generic Updates: ${genericUpdateCount}`,
  ].join("\n");
}
