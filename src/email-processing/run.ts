import config from "@/env";
import {
  logEmailDedupeCompleted,
  logFetchedEmails,
  logRelevanceClassificationCompleted,
  logStatusClassificationCompleted,
  logRunFinished,
  logRunStarted,
} from "@/email-processing/logging";
import { fetchMessages } from "@/integrations/microsoft-graph/messages";
import {
  filterUnprocessedMessages,
  markMessagesAsProcessed,
} from "@/email-processing/dedupe";
import {
  classifyEmailRelevanceStage,
  classifyEmailStatusStage,
} from "@/email-processing/processing";
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

  const statusResult = await classifyEmailStatusStage({
    emails: relevanceResult.relevantEmails,
  });

  logStatusClassificationCompleted({
    runId,
    reviewedCount: statusResult.reviewedCount,
    rejectionCount: statusResult.rejectionCount,
    interviewInvitationCount: statusResult.interviewInvitationCount,
    assessmentCount: statusResult.assessmentCount,
    genericUpdateCount: statusResult.genericUpdateCount,
  });

  await setLastSuccessfulRunAt(new Date());

  logRunFinished(runId);
}
