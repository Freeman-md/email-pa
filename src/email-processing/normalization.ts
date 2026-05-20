import { limitText, normalizeWhitespace } from "@/shared/utils";
import { NormalizedEmail } from "@/email-processing/types";
import { GraphMessage } from "@/integrations/microsoft-graph/types";

const MAX_BODY_PREVIEW_LENGTH = 1000;

export function normalizeEmail(message: GraphMessage): NormalizedEmail {
  return {
    messageId: message.id,
    subject: normalizeWhitespace(message.subject ?? ""),
    senderName: message.sender?.emailAddress?.name,
    senderAddress: message.sender?.emailAddress?.address,
    receivedAt: message.receivedDateTime,
    webLink: message.webLink,
    bodyPreview: limitText(
      normalizeWhitespace(message.bodyPreview ?? ""),
      MAX_BODY_PREVIEW_LENGTH
    ),
  };
}

export function normalizeEmails(messages: GraphMessage[]) {
  return messages.map(normalizeEmail);
}
