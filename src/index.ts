import { processEmail } from "@/process-email";
import { Email, GraphEmail } from "@/shared/types";
import { initializeRun, setLastSuccessfulRunAt } from "./state";
import { buildRunSummaryMessage, logRunEvent, logRunFailureEvent } from "./shared/logging";
import { fetchEmails } from "./integrations/microsoft-graph/service";
import { sendTelegramMessage } from "./integrations/telegram/client";

try {
  const {
    runId,
    windowStart,
  } = await initializeRun()
  const processedEmails: Email[] = [];
  const unprocessedEmails: GraphEmail[] = [];

  logRunEvent("started", { runId, windowStart });

  const emails = await fetchEmails(windowStart);

  logRunEvent("emails_fetched", { runId, count: emails.length });

  for (const email of emails) {
    try {
      processedEmails.push(await processEmail(email));
    } catch (error) {
      unprocessedEmails.push(email);
    }
  }

  logRunEvent("emails_processed", { runId, count: processedEmails.length });

  await sendTelegramMessage({
    text: buildRunSummaryMessage({
      runId,
      processedEmails,
      unprocessedEmails,
    })
  });

  await setLastSuccessfulRunAt(new Date());

  logRunEvent("finished", { runId, finishedAt: new Date() });
} catch (error) {
  logRunFailureEvent(
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
}
