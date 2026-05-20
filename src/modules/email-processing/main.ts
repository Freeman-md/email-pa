import config from "@/env";
import {
  logEmailDedupeCompleted,
  logFetchedEmails,
  logRelevanceClassificationCompleted,
  logRunFinished,
  logRunStarted,
} from "@/modules/email-processing/logging";
import { getAllMessagesReceivedSince } from "@/modules/microsoft-graph/messages";
import {
  filterUnprocessedMessages,
  markMessagesAsProcessed,
} from "@/modules/email-processing/dedupe";
import {
  calculateRunWindow,
  getLastSuccessfulRunAt,
  normalizeEmails,
  setLastSuccessfulRunAt,
} from "@/modules/email-processing/utils";
import { classifyEmailRelevanceStage } from "@/modules/email-processing/relevance";

const OVERLAP_MINUTES = 1000;

export async function runEmailProcessing() {
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

  const relevanceResult = await classifyEmailRelevanceStage({
    emails: normalizedEmails,
  });

  logRelevanceClassificationCompleted({
    runId,
    reviewedCount: relevanceResult.reviewedCount,
    relevantCount: relevanceResult.relevantCount,
    irrelevantCount: relevanceResult.irrelevantCount,
  });

  await setLastSuccessfulRunAt(new Date());

  logRunFinished(runId);
}