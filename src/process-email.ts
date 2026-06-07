import { fetchEmailWithBody, markEmailAsRead, markEmailAsUnread } from "@/integrations/microsoft-graph/service";
import { createJob, updateJobStatus } from "@/integrations/airtable/repositories/jobs";
import { AirtableRecord, Email, GraphEmail } from "@/shared/types";
import { createEmail, deleteEmail, getEmail, updateEmail } from "@/integrations/airtable/repositories/emails";
import {
  logEmailEvent,
  logEmailFailureEvent,
} from "@/shared/logging";
import { limitText, normalizeWhitespace } from "@/shared/utils";
import { resolveJobRecord } from "./integrations/ai/agents";
import { classifyEmailRelevance, classifyEmailStatus } from "./integrations/ai/classification";
import { MAX_BODY_PREVIEW_LENGTH, MAX_FULL_BODY_LENGTH, MAX_RATE_LIMIT_RETRIES, PROCESS_RETRY_DELAY_MS } from "./shared/constants";
import { isRetryableProcessingError, withRetryCooldown } from "./shared/retry";

async function enrichEmailWithFullBody(
  email: Email
): Promise<Email> {
  if (email.body) {
    return email;
  }

  const fullMessage = await fetchEmailWithBody(email.message_id);

  return {
    ...email,
    body: limitText(
      normalizeWhitespace(fullMessage.body?.content ?? ""),
      MAX_FULL_BODY_LENGTH
    ),
  };
}

async function getOrCreateEmailRecord(
  graphEmail: GraphEmail
): Promise<{
  record: AirtableRecord<Email>;
  newEmailCreated: boolean;
}> {
  const existingRecord = await getEmail(graphEmail.id);

  if (existingRecord) {
    return {
      record: existingRecord,
      newEmailCreated: false,
    };
  }

  const createdRecord = await createEmail({
    message_id: graphEmail.id,
    received_at: graphEmail.receivedDateTime,
    subject: graphEmail.subject,
    sender_name: graphEmail.sender?.emailAddress?.name,
    sender_address: graphEmail.sender?.emailAddress?.address,
    web_link: graphEmail.webLink,
  });

  return {
    record: createdRecord,
    newEmailCreated: true,
  };
}

function normalizeGraphEmail(
  record: Email,
  graphEmail: GraphEmail
): Email {
  return {
    ...record,
    subject: normalizeWhitespace(graphEmail.subject ?? ""),
    body_preview: limitText(
      normalizeWhitespace(graphEmail.bodyPreview ?? ""),
      MAX_BODY_PREVIEW_LENGTH
    ),
    body: graphEmail.body?.content
      ? limitText(
          normalizeWhitespace(graphEmail.body.content),
          MAX_FULL_BODY_LENGTH
        )
      : undefined,
  };
}

async function finalizeIrrelevantEmail(
  recordId: string,
  email: Email,
  relevanceResult: Awaited<ReturnType<typeof classifyEmailRelevance>>
): Promise<Email> {
  const updatedRecord = await updateEmail(recordId, {
    status: "irrelevant",
    classification_confidence: relevanceResult.relevance.confidence,
    classification_evidence: relevanceResult.relevance.evidence.join(" | "),
  });

  return {
    ...email,
    ...updatedRecord.fields,
  };
}

async function finalizeClassifiedEmail(
  recordId: string,
  email: Email,
  statusResult: Awaited<ReturnType<typeof classifyEmailStatus>>
): Promise<Email> {
  const updatedRecord = await updateEmail(recordId, {
    status: statusResult.status.status,
    classification_confidence: statusResult.status.confidence,
    classification_evidence: statusResult.status.evidence.join(" | "),
  });

  return {
    ...email,
    ...updatedRecord.fields,
  };
}

async function attemptProcessEmail(graphEmail: GraphEmail): Promise<Email> {
  let createdRecordId: string | null = null;

  try {
    logEmailEvent("processing_started", graphEmail.id);

    const { record, newEmailCreated } = await getOrCreateEmailRecord(graphEmail);

    if (newEmailCreated) {
      createdRecordId = record.id;
    }

    logEmailEvent("record_ready", graphEmail.id);

    if (record.fields.status) {
      return record.fields;
    }

    const normalizedEmail = normalizeGraphEmail(record.fields, graphEmail);

    const relevanceResult = await classifyEmailRelevance(normalizedEmail);

    logEmailEvent("relevance_classified", graphEmail.id);

    let processedEmail: Email;

    if (!relevanceResult.relevance.isRelevant) {
      processedEmail = await finalizeIrrelevantEmail(
        record.id,
        normalizedEmail,
        relevanceResult
      );
    } else {
      const statusResult = await classifyEmailStatus(
        await enrichEmailWithFullBody(normalizedEmail)
      );

      logEmailEvent("status_classified", graphEmail.id);

      processedEmail = await finalizeClassifiedEmail(
        record.id,
        normalizedEmail,
        statusResult
      );

      const jobRecordResolution = await resolveJobRecord({
        subject: processedEmail.subject,
        sender_name: processedEmail.sender_name,
        sender_address: processedEmail.sender_address,
        body: processedEmail.body,
        body_preview: processedEmail.body_preview,
        status: processedEmail.status,
      });

      switch (jobRecordResolution.action) {
        case "create":
          await createJob({
            job_title: jobRecordResolution.job_title!,
            company_name: jobRecordResolution.company_name!,
            status: jobRecordResolution.status!,
          });
          break;
        case "update":
          await updateJobStatus(
            jobRecordResolution.target_record_id!,
            jobRecordResolution.status!
          );
          break;
        case "skip":
          break;
      }
    }

    // sublet this to a queue later to mark all processed emails as read - in the index.ts
    try {
      await markEmailAsRead(graphEmail.id);

      logEmailEvent("marked_read", graphEmail.id);
    } catch (error) {
      logEmailFailureEvent("mark_read_failed", {
        messageId: graphEmail.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return processedEmail;
  } catch (error) {
    logEmailFailureEvent("rolling_back", {
      messageId: graphEmail.id,
    });

    if (createdRecordId) {
      try {
        await deleteEmail(createdRecordId);
      } catch { }
    }

    throw error;
  }
}

export async function processEmail(graphEmail: GraphEmail): Promise<Email> {
  try {
    return await withRetryCooldown({
      operation: () => attemptProcessEmail(graphEmail),
      cooldownMs: PROCESS_RETRY_DELAY_MS,
      maxRetries: MAX_RATE_LIMIT_RETRIES,
      shouldRetry: isRetryableProcessingError,
      onRetry: ({ attempt, error }) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        logEmailFailureEvent("retrying", {
          messageId: graphEmail.id,
          attempt,
          maxRetries: MAX_RATE_LIMIT_RETRIES,
          error: errorMessage,
        });
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to process email (messageId: ${graphEmail.id}): ${errorMessage}`
    );
  }
}
