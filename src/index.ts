import { processEmail } from "@/process-email";
import { initializeRun, setLastSuccessfulRunAt } from "./state";
import { logRunEvent } from "./shared/logging";
import { fetchEmails } from "./integrations/microsoft-graph/service";

try {
  const {
    runId,
    windowStart,
  } = await initializeRun()

  logRunEvent("started", { runId, windowStart });

  const emails = await fetchEmails(windowStart);

  logRunEvent("emails_fetched", { runId, count: emails.length });

  const processedEmails = [];

  for (const email of emails) {
    // we need to separate processed emails from unprocessed emails. We have a try catch around here. If it fails, If an email processing fails afgter multiple retries, it goes as unprocessed. We can then decide what to do with those. Side effects can then be applied to processed emails like - mark as read.
    processedEmails.push(await processEmail(email));
  }

  logRunEvent("emails_processed", { runId, count: processedEmails.filter(Boolean).length });

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

  logRunEvent("finished", { runId, finishedAt: new Date() });
} catch (error) {
  console.error("Email status updater failed", {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
}
