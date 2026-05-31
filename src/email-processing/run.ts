import {
  logRunFinished,
  logRunStarted,
  buildRunSummaryMessage,
} from "@/email-processing/logging";
import { fetchEmails, fetchMessageWithBody } from "@/integrations/microsoft-graph/service";
import { initializeRun, setLastSuccessfulRunAt } from "./state";
import { sendTelegramMessage } from "@/integrations/telegram/client";
import { GraphEmail } from "@/integrations/microsoft-graph/types";
import { Email } from "./types";
import { createEmail, getEmail, updateEmail } from "@/integrations/airtable/emails.repository";
import { limitText, MAX_BODY_PREVIEW_LENGTH, MAX_FULL_BODY_LENGTH, normalizeWhitespace } from "@/shared/utils";
import { classifyEmailRelevance, classifyEmailStatus } from "./ai/classification";

async function enrichEmailWithFullBody(
  email: Email
): Promise<Email> {
  const fullMessage = await fetchMessageWithBody(email["Message ID"]);

  return {
    ...email,
    Body: limitText(
      normalizeWhitespace(fullMessage.body?.content ?? ""),
      MAX_FULL_BODY_LENGTH
    ),
  };
}

async function processEmail(message: GraphEmail): Promise<Email | void> {
  try {
    let record = await getEmail(message.id)

    if (!record) {
      record = await createEmail({
        "Message ID": message.id,
        "Received At": message.receivedDateTime,
        Subject: message.subject,
        "Sender Name": message.sender?.emailAddress?.name,
        "Sender Address": message.sender?.emailAddress?.address,
        "Web Link": message.webLink
      })
    }

    if (record?.fields?.Status) {
      return record.fields;
    }

    const email: Email = {
      ...record.fields,
      Subject: normalizeWhitespace(message.subject ?? ""),
      "Body Preview": limitText(
        normalizeWhitespace(message.bodyPreview ?? ""),
        MAX_BODY_PREVIEW_LENGTH
      ),
    }

    const emailRelevance = await classifyEmailRelevance(email)

    if (!emailRelevance.relevance.isRelevant) {
      const updatedRecord = await updateEmail(record.id, {
        Status: "irrelevant",
        "Classification Confidence": emailRelevance.relevance.confidence,
        "Classification Evidence": emailRelevance.relevance.evidence.join(" | "),
      });

      return {
        ...email,
        ...updatedRecord.fields,
      };
    }

    const emailWithBody = await enrichEmailWithFullBody(email)

    const emailStatus = await classifyEmailStatus(emailWithBody)

    const updatedRecord = await updateEmail(record.id, {
      Status: emailStatus.status.status,
      "Classification Confidence": emailStatus.status.confidence,
      "Classification Evidence": emailStatus.status.evidence.join(" | "),
    });

    return {
      ...emailWithBody,
      ...updatedRecord.fields
    };
  } catch (error) {
    console.error("Failed to initialize message processing", {
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return;
  }
}

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

  const messages = await fetchEmails(windowStart);

  console.log("Fetched emails", {
    runId,
    count: messages.length,
  });

  const processedEmails = await Promise.all(
    messages.map((message) => processEmail(message))
  );

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
}
