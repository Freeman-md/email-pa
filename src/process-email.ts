import { fetchEmailWithBody, markEmailAsRead } from "@/integrations/microsoft-graph/service";
import { createJob, updateJobStatus } from "@/integrations/airtable/repositories/jobs";
import { AirtableRecord, Email, GraphEmail } from "@/shared/types";
import { createEmail, deleteEmail, getEmail, updateEmail } from "@/integrations/airtable/repositories/emails";
import {
  logEmailEvent,
  logEmailFailureEvent,
} from "@/shared/logging";
import { limitText, normalizeWhitespace } from "@/shared/utils";
import {
  classifyEmailRelevance,
  classifyEmailStatus,
  resolveJobRecord,
} from "./integrations/ai/operations";
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

async function resolveAndApplyJobRecord(email: Email): Promise<void> {
  const jobRecordResolution = await resolveJobRecord({
    subject: email.subject,
    sender_name: email.sender_name,
    sender_address: email.sender_address,
    body: email.body,
    body_preview: email.body_preview,
    status: email.status,
  });

  switch (jobRecordResolution.action) {
    case "create": {
      const { job_title, company_name, status } = jobRecordResolution;

      if (!job_title || !company_name || !status) {
        throw new Error("Create resolution is missing required job fields.");
      }

      await createJob({
        job_title,
        company_name,
        status,
      });
      return;
    }
    case "update": {
      const { target_record_id, status } = jobRecordResolution;

      if (!target_record_id || !status) {
        throw new Error("Update resolution is missing required job fields.");
      }

      await updateJobStatus(target_record_id, status);
      return;
    }
    case "skip":
      return;
  }
}

async function processRelevantEmail(
  recordId: string,
  email: Email,
  messageId: string
): Promise<Email> {
  const statusResult = await classifyEmailStatus(
    await enrichEmailWithFullBody(email)
  );

  logEmailEvent("status_classified", messageId);

  const processedEmail = await finalizeClassifiedEmail(
    recordId,
    email,
    statusResult
  );

  await resolveAndApplyJobRecord(processedEmail);

  return processedEmail;
}

async function markEmailAsReadIfPossible(messageId: string): Promise<void> {
  try {
    await markEmailAsRead(messageId);
    logEmailEvent("marked_read", messageId);
  } catch (error) {
    logEmailFailureEvent("mark_read_failed", {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
      processedEmail = await processRelevantEmail(
        record.id,
        normalizedEmail,
        graphEmail.id
      );
    }

    await markEmailAsReadIfPossible(graphEmail.id);

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
