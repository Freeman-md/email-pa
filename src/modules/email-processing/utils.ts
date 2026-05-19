import config from "@/config/env";
import { getSetting, setSetting } from "@/modules/airtable/tables/app-settings";
import { limitText, normalizeWhitespace } from "@/shared/helpers";
import { GraphMessage, NormalizedEmail } from "@/shared/types/email";

const MAX_BODY_PREVIEW_LENGTH = 1000;

export async function getLastSuccessfulRunAt() {
  const { lastSuccessfulRunKey } = config();
  return getSetting(lastSuccessfulRunKey);
}

export async function setLastSuccessfulRunAt(date: Date) {
  const { lastSuccessfulRunKey } = config();
  return setSetting(lastSuccessfulRunKey, date.toISOString());
}

export function calculateRunWindow({
  startedAt,
  lastSuccessfulRunAt,
  lookbackHours,
  overlapMinutes,
}: {
  startedAt: Date;
  lastSuccessfulRunAt: string | null;
  lookbackHours: string;
  overlapMinutes: number;
}) {
  const defaultLookbackMs = Number(lookbackHours) * 60 * 60 * 1000;

  return lastSuccessfulRunAt
    ? new Date(
        new Date(lastSuccessfulRunAt).getTime() - overlapMinutes * 60 * 1000
      )
    : new Date(startedAt.getTime() - defaultLookbackMs);
}

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
