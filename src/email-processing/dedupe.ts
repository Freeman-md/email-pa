import {
  createProcessedEmail,
  getProcessedEmailsByMessageIds,
  getUniqueProcessedMessageIds,
} from "@/integrations/airtable/tables/processed-emails";
import { createProcessedEmailFields } from "@/email-processing/state";
import type { ProcessedEmail } from "@/email-processing/types";
import type { GraphMessage } from "@/integrations/microsoft-graph/types";

export type EmailDedupeResult = {
  newMessages: GraphMessage[];
  skippedMessages: GraphMessage[];
};

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
    const fields: ProcessedEmail = createProcessedEmailFields({
      message,
      runId,
      processedAt,
    });

    await createProcessedEmail(fields);
  }
}
