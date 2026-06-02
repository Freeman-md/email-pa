export function logRunStarted({
  runId,
  startedAt,
  lookbackHours,
  lastSuccessfulRunAt,
  windowStart,
}: {
  runId: string;
  startedAt: Date;
  lookbackHours: string;
  lastSuccessfulRunAt: string | null;
  windowStart: Date;
}) {
  console.log("Email status updater started", {
    runId,
    startedAt: startedAt.toISOString(),
    lookbackHours,
    lastSuccessfulRunAt,
    windowStart: windowStart.toISOString(),
  });
}

export function logRunFinished(runId: string) {
  console.log("Email status updater finished", {
    runId,
    finishedAt: new Date().toISOString(),
    emailsProcessed: 0,
  });
}

export function logEmailProcessingStarted({
  messageId,
  subject,
}: {
  messageId: string;
  subject?: string;
}) {
  console.log("Processing email", {
    messageId,
    subject: subject ?? "(none)",
  });
}

export function logEmailRecordReady({
  messageId,
  recordId,
  newEmailCreated,
}: {
  messageId: string;
  recordId: string;
  newEmailCreated: boolean;
}) {
  console.log("Email record ready", {
    messageId,
    recordId,
    newEmailCreated,
  });
}

export function logEmailRelevanceClassified({
  messageId,
  isRelevant,
  confidence,
}: {
  messageId: string;
  isRelevant: boolean;
  confidence: "high" | "medium" | "low";
}) {
  console.log("Relevance classified", {
    messageId,
    isRelevant,
    confidence,
  });
}

export function logEmailStatusClassified({
  messageId,
  status,
  confidence,
}: {
  messageId: string;
  status: string;
  confidence: "high" | "medium" | "low";
}) {
  console.log("Status classified", {
    messageId,
    status,
    confidence,
  });
}

export function logMarkingEmailAsRead(messageId: string) {
  console.log("Marking email as read", {
    messageId,
  });
}

export function logFailedToMarkEmailAsRead({
  messageId,
  error,
}: {
  messageId: string;
  error: string;
}) {
  console.warn("Failed to mark email as read", {
    messageId,
    error,
  });
}

export function logRollingBackEmailProcessing({
  messageId,
  createdRecordId,
}: {
  messageId: string;
  createdRecordId: string | null;
}) {
  console.log("Rolling back email processing", {
    messageId,
    createdRecordId,
  });
}

export function logRetryingEmailProcessing({
  messageId,
  attempt,
  maxRetries,
  delayMs,
  error,
}: {
  messageId: string;
  attempt: number;
  maxRetries: number;
  delayMs: number;
  error: string;
}) {
  console.warn("Retrying email processing", {
    messageId,
    attempt,
    maxRetries,
    delayMs,
    error,
  });
}

export function buildRunSummaryMessage({
  runId,
  fetchedCount,
  newCount,
  skippedCount,
  relevance,
  status,
}: {
  runId: string;
  fetchedCount: number;
  newCount: number;
  skippedCount: number;
  relevance: {
    reviewedCount: number;
    relevantCount: number;
    irrelevantCount: number;
  };
  status: {
    reviewedCount: number;
    rejectionCount: number;
    interviewInvitationCount: number;
    assessmentCount: number;
    genericUpdateCount: number;
  };
}) {
  return [
    "Job Email Run",
    "",
    `Run ID: ${runId}`,
    `Fetched: ${fetchedCount}`,
    `New: ${newCount}`,
    `Skipped: ${skippedCount}`,
    "",
    "Relevance",
    `- Reviewed: ${relevance.reviewedCount}`,
    `- Relevant: ${relevance.relevantCount}`,
    `- Irrelevant: ${relevance.irrelevantCount}`,
    "",
    "Status",
    `- Reviewed: ${status.reviewedCount}`,
    `- Rejections: ${status.rejectionCount}`,
    `- Interviews: ${status.interviewInvitationCount}`,
    `- Assessments: ${status.assessmentCount}`,
    `- Generic Updates: ${status.genericUpdateCount}`,
  ].join("\n");
}
