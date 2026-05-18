import { GraphMessage } from "#/types";

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

export function logFetchedEmails(runId: string, messages: GraphMessage[]) {
  console.log("Fetched windowed emails", {
    runId,
    count: messages.length,
    emails: messages.map((message: GraphMessage) => ({
      subject: message.subject,
      from: message.sender?.emailAddress?.address,
      receivedDateTime: message.receivedDateTime,
      webLink: message.webLink,
      bodyPreview: message.bodyPreview,
    })),
  });
}

export function logRunFinished(runId: string) {
  console.log("Email status updater finished", {
    runId,
    finishedAt: new Date().toISOString(),
    emailsProcessed: 0,
  });
}
