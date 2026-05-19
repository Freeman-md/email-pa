import config from "@/config";
import {
  logEmailDedupeCompleted,
  logFetchedEmails,
  logRunFinished,
  logRunStarted,
} from "@/logging";
import { normalizeEmails } from "@/helpers/email-normalizer";
import { getAllMessagesReceivedSince } from "@/services/microsoft-graph/messages";
import {
  calculateRunWindow,
  getLastSuccessfulRunAt,
  setLastSuccessfulRunAt,
} from "@/run-state";
import { filterUnprocessedMessages, markMessagesAsProcessed } from "@/services/email-dedupe";

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
  const normalizedEmails = normalizeEmails(newMessages);

  logFetchedEmails(runId, normalizedEmails);

  logEmailDedupeCompleted({
    runId,
    fetchedCount: messages.length,
    newCount: newMessages.length,
    skippedCount: skippedMessages.length,
  });

  await markMessagesAsProcessed(newMessages, runId);

  await setLastSuccessfulRunAt(new Date());

  logRunFinished(runId);
}
