import { fetchEmailWithBody, markEmailAsRead } from "@/integrations/microsoft-graph/service";
import { Email, GraphEmail } from "@/shared/types";
import { createEmail, getEmail, updateEmail } from "@/integrations/airtable/repositories/emails";
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

async function getOrCreateEmailRecord(graphEmail: GraphEmail) {
  const existingRecord = await getEmail(graphEmail.id);

  if (existingRecord) {
    return existingRecord;
  }

  return createEmail({
    message_id: graphEmail.id,
    received_at: graphEmail.receivedDateTime,
    subject: graphEmail.subject,
    sender_name: graphEmail.sender?.emailAddress?.name,
    sender_address: graphEmail.sender?.emailAddress?.address,
    web_link: graphEmail.webLink,
  });
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

async function finalizeIrrelavantEmail(
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
  try {
    const record = await getOrCreateEmailRecord(graphEmail);

    if (record.fields.Status) {
      return record.fields;
    }

    const normalizedEmail = normalizeGraphEmail(record.fields, graphEmail);

    const relevanceResult = await classifyEmailRelevance(normalizedEmail);

    if (!relevanceResult.relevance.isRelevant) {
      return finalizeIrrelavantEmail(record.id, normalizedEmail, relevanceResult);
    }

    const statusResult = await classifyEmailStatus(
      await enrichEmailWithFullBody(normalizedEmail)
    );

    await markEmailAsRead(graphEmail.id);

    return finalizeClassifiedEmail(record.id, normalizedEmail, statusResult);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to initialize email processing (messageId: ${graphEmail.id}): ${errorMessage}`
    );
  }
}