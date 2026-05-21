import config from "@/env";
import {
  logEmailDedupeCompleted,
  logFetchedEmails,
  logRelevanceClassificationCompleted,
  logRunFinished,
  logRunStarted,
} from "@/email-processing/logging";
import { fetchMessages } from "@/integrations/microsoft-graph/messages";
import {
  filterUnprocessedMessages,
  markMessagesAsProcessed,
} from "@/email-processing/dedupe";
import { classifyEmailRelevanceStage } from "@/email-processing/processing";
import { calculateRunWindow, getLastSuccessfulRunAt, setLastSuccessfulRunAt } from "./state";
import { normalizeEmails } from "./mappers";

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

  const messages = await fetchMessages(windowStart);

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
