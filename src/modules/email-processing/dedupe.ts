import {
  createProcessedEmail,
  getProcessedEmailsByMessageIds,
  getUniqueProcessedMessageIds,
} from "@/modules/airtable/tables/processed-emails";
import type { GraphMessage, ProcessedEmail } from "@/shared/types/email";

export type EmailDedupeResult = {
  newMessages: GraphMessage[];
  skippedMessages: GraphMessage[];
};

function getSenderAddress(message: GraphMessage) {
  return message.sender?.emailAddress?.address ?? "";
}

export async function filterUnprocessedMessages(
  messages: GraphMessage[]
): Promise<EmailDedupeResult> {
  const messageIds = messages.map((message) => message.id);
  const processedEmails = await getProcessedEmailsByMessageIds(messageIds);
  const processedMessageIds = getUniqueProcessedMessageIds(processedEmails);

  const newMessages: GraphMessage[] = [];
  const skippedMessages: GraphMessage[] = [];

  for (const message of messages) {
    if (processedMessageIds.has(message.id)) {
      skippedMessages.push(message);
      continue;
    }

    newMessages.push(message);
  }

  return {
    newMessages,
    skippedMessages,
  };
}

export async function markMessagesAsProcessed(
  messages: GraphMessage[],
  runId: string
) {
  const processedAt = new Date().toISOString();

  for (const message of messages) {
    const fields: ProcessedEmail = {
      "Message ID": message.id,
      "Received At": message.receivedDateTime,
      Subject: message.subject,
      Sender: getSenderAddress(message),
      "Run ID": runId,
      "Processed At": processedAt,
    };

    await createProcessedEmail(fields);
  }
}
