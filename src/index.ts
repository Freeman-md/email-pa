import { processEmail } from "@/process-email";
import { initializeRun, setLastSuccessfulRunAt } from "./state";
import { logRunFinished, logRunStarted } from "./shared/logging";
import { fetchEmails } from "./integrations/microsoft-graph/service";

try {
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

  const messages = await fetchEmails(windowStart);

  console.log("Fetched emails", {
    runId,
    count: messages.length,
  });

  const processedEmails = [];

  for (const message of messages) {
    processedEmails.push(await processEmail(message));
  }

  console.log("Processed emails", {
    runId,
    count: processedEmails.filter(Boolean).length,
  });

  // const summary = buildRunSummaryMessage({
  //   runId,
  //   fetchedCount: messages.length,
  //   newCount: newMessages.length,
  //   skippedCount: skippedMessages.length,
  //   relevance: relevanceResult,
  //   status: statusResult,
  // });

  // await sendTelegramMessage({ text: summary });

  // if there was any error during processing, rollback the created record. Also, last successful run at shouldn't be updated.

  await setLastSuccessfulRunAt(new Date());

  logRunFinished(runId);
} catch (error) {
  console.error("Email status updater failed", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}