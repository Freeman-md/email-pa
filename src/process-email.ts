import { fetchEmailWithBody, markEmailAsRead, markEmailAsUnread } from "@/integrations/microsoft-graph/service";
import { AirtableRecord, Email, GraphEmail } from "@/shared/types";
import { createEmail, deleteEmail, getEmail, updateEmail } from "@/integrations/airtable/repositories/emails";
import { limitText, normalizeWhitespace } from "@/shared/utils";
import { classifyEmailRelevance, classifyEmailStatus } from "./integrations/ai/classification";
import { MAX_BODY_PREVIEW_LENGTH, MAX_FULL_BODY_LENGTH } from "./shared/constants";

async function enrichEmailWithFullBody(
  email: Email
): Promise<Email> {
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
  };
}

async function finalizeIrrelevantEmail(
  recordId: string,
  email: Email,
  relevanceResult: Awaited<ReturnType<typeof classifyEmailRelevance>>
): Promise<Email> {
  const updatedRecord = await updateEmail(recordId, {
    Status: "irrelevant",
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
    Status: statusResult.status.status,
    classification_confidence: statusResult.status.confidence,
    classification_evidence: statusResult.status.evidence.join(" | "),
  });

  return {
    ...email,
    ...updatedRecord.fields,
  };
}

export async function processEmail(graphEmail: GraphEmail): Promise<Email | void> {
  let createdRecordId: string | null = null
  let markedAsRead = false

  try {
    const { record, newEmailCreated } = await getOrCreateEmailRecord(graphEmail);
    
    if (newEmailCreated) {
      createdRecordId = record.id;
    }

    if (record.fields.Status) {
      return record.fields;
    }

    const normalizedEmail = normalizeGraphEmail(record.fields, graphEmail);

    const relevanceResult = await classifyEmailRelevance(normalizedEmail);

    if (!relevanceResult.relevance.isRelevant) {
      return finalizeIrrelevantEmail(record.id, normalizedEmail, relevanceResult);
    }

    const statusResult = await classifyEmailStatus(
      await enrichEmailWithFullBody(normalizedEmail)
    );

    await markEmailAsRead(graphEmail.id);
    markedAsRead = true;

    return finalizeClassifiedEmail(record.id, normalizedEmail, statusResult);
  } catch (error) {
    if (markedAsRead) {
      try {
        await markEmailAsUnread(graphEmail.id);
      } catch {}
    }

     if (createdRecordId) {
      try {
        await deleteEmail(createdRecordId);
      } catch {}
    }

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to process email (messageId: ${graphEmail.id}): ${errorMessage}`
    );
  }
}