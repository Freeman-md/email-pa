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