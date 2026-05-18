import config from "#/config";
import {
  logFetchedEmails,
  logRunFinished,
  logRunStarted,
} from "#/logging";
import { getAllMessagesReceivedSince } from "#/services/microsoft-graph/messages";
import {
  calculateRunWindow,
  getLastSuccessfulRunAt,
  setLastSuccessfulRunAt,
} from "#/run-state";
import { filterUnprocessedMessages, markMessagesAsProcessed } from "#/services/email-dedupe.js";

const OVERLAP_MINUTES = 10;

export async function runEmailStatusUpdater() {
  const runId = crypto.randomUUID();
  const startedAt = new Date();

  const { lookbackHours } = config();
  const lastSuccessfulRunAt = await getLastSuccessfulRunAt();
  const windowStart = calculateRunWindow({
    startedAt,
    lastSuccessfulRunAt,
    lookbackHours,
    overlapMinutes: OVERLAP_MINUTES,
  });

  logRunStarted({
    runId,
    startedAt,
    lookbackHours,
    lastSuccessfulRunAt,
    windowStart,
  });

  const messages = await getAllMessagesReceivedSince(windowStart);

  const { newMessages, skippedMessages } = await filterUnprocessedMessages(
    messages
  );

  logFetchedEmails(runId, newMessages);

  console.log("Email dedupe completed", {
    runId,
    fetchedCount: messages.length,
    newCount: newMessages.length,
    skippedCount: skippedMessages.length,
  });

  await markMessagesAsProcessed(newMessages, runId);

  await setLastSuccessfulRunAt(new Date());

  logRunFinished(runId);
}
