import { escapeAirtableString } from "@/shared/utils";
import { createRecords, listRecords, updateRecord } from "@/modules/airtable/client";
import { AirtableRecord } from "@/shared/types/airtable";
import { ProcessedEmail } from "@/shared/types/email";

const PROCESSED_EMAILS_TABLE = "Processed Emails"

async function findProcessedEmailByMessageId(messageId: string) {
  const formula = encodeURIComponent(
    `{Message ID}='${escapeAirtableString(messageId)}'`
  );

  const response = await listRecords<ProcessedEmail>(
    PROCESSED_EMAILS_TABLE,
    `?filterByFormula=${formula}&maxRecords=1`
  )

  return response.records[0] ?? null
}

export async function hasProcessedEmail(messageId: string) {
  const record = await findProcessedEmailByMessageId(messageId);
  return Boolean(record);
}

export async function getProcessedEmail(messageId: string) {
  return findProcessedEmailByMessageId(messageId);
}

export async function createProcessedEmail(fields: ProcessedEmail) {
  return createRecords<ProcessedEmail>(PROCESSED_EMAILS_TABLE, fields);
}

export async function updateProcessedEmail(
  recordId: string,
  fields: Partial<ProcessedEmail>
) {
  return updateRecord<ProcessedEmail>(PROCESSED_EMAILS_TABLE, recordId, fields);
}

export async function getProcessedEmailsByMessageIds(messageIds: string[]) {
  if (messageIds.length === 0) {
    return [];
  }

  const conditions = messageIds.map(
    (messageId) =>
      `{Message ID}='${escapeAirtableString(messageId)}'`
  );

  const formula = encodeURIComponent(`OR(${conditions.join(",")})`);

  const response = await listRecords<ProcessedEmail>(
    PROCESSED_EMAILS_TABLE,
    `?filterByFormula=${formula}`
  );

  return response.records;
}


export function getUniqueProcessedMessageIds(
  records: AirtableRecord<ProcessedEmail>[]
) {
  return new Set(
    records
      .map((record) => record.fields["Message ID"])
      .filter(Boolean)
  );
}
