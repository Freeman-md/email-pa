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
import { initializeRun, setLastSuccessfulRunAt } from "./state";
import { normalizeEmails } from "./mappers";

export async function runEmailProcessing() {
  const {
    runId,
    startedAt,
    lookbackHours,
    lastSuccessfulRunAt,
    windowStart,
  } = await initializeRun()

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
