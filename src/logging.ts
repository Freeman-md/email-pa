import { NormalizedEmail } from "@/types";

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

export function logFetchedEmails(runId: string, emails: NormalizedEmail[]) {
  console.log("Fetched windowed emails", {
    runId,
    count: emails.length,
    emails: emails.map((email) => ({
      subject: email.subject,
      from: email.senderAddress,
      receivedAt: email.receivedAt,
      webLink: email.webLink,
      bodyPreview: email.bodyPreview,
    })),
  });
}

export function logEmailDedupeCompleted({
  runId,
  fetchedCount,
  newCount,
  skippedCount,
}: {
  runId: string;
  fetchedCount: number;
  newCount: number;
  skippedCount: number;
}) {
  console.log("Email dedupe completed", {
    runId,
    fetchedCount,
    newCount,
    skippedCount,
  });
}

export function logRunFinished(runId: string) {
  console.log("Email status updater finished", {
    runId,
    finishedAt: new Date().toISOString(),
    emailsProcessed: 0,
  });
}
