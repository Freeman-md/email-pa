import { fetchMessageWithBody } from "@/integrations/microsoft-graph/service";
import { Email, GraphEmail } from "@/shared/types";
import { createEmail, getEmail, updateEmail } from "@/integrations/airtable/repositories/emails";
import { limitText, normalizeWhitespace } from "@/shared/utils";
import { classifyEmailRelevance, classifyEmailStatus } from "./integrations/ai/classification";
import { MAX_BODY_PREVIEW_LENGTH, MAX_FULL_BODY_LENGTH } from "./shared/constants";

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

export async function processEmail(message: GraphEmail): Promise<Email | void> {
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

    const relevanceResult = await classifyEmailRelevance(email)

    if (!relevanceResult.relevance.isRelevant) {
      const updatedRecord = await updateEmail(record.id, {
        Status: "irrelevant",
        "Classification Confidence": relevanceResult.relevance.confidence,
        "Classification Evidence": relevanceResult.relevance.evidence.join(" | "),
      });

      return {
        ...email,
        ...updatedRecord.fields,
      };
    }

    const emailWithBody = await enrichEmailWithFullBody(email)

    const statusResult = await classifyEmailStatus(emailWithBody)

    const updatedRecord = await updateEmail(record.id, {
      Status: statusResult.status.status,
      "Classification Confidence": statusResult.status.confidence,
      "Classification Evidence": statusResult.status.evidence.join(" | "),
    });

    return {
      ...emailWithBody,
      ...updatedRecord.fields
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Failed to initialize message processing (messageId: ${message.id}): ${errorMessage}`
    );
  }
}