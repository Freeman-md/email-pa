import { escapeAirtableString } from "@/shared/utils";
import { createRecord, listRecords, updateRecord } from "@/integrations/airtable/client";
import { AirtableRecord, Email } from "@/shared/types";

const EMAILS_TABLE = "Emails"

export async function getEmail(messageId: string): Promise<AirtableRecord<Email> | null> {
  const formula = encodeURIComponent(
    `{Message ID}='${escapeAirtableString(messageId)}'`
  );

  const response = await listRecords<Email>(
    EMAILS_TABLE,
    `?filterByFormula=${formula}&maxRecords=1`
  )

  return response.records[0] ?? null
}

export async function createEmail(fields: Email): Promise<AirtableRecord<Email>> {
  const response = await createRecord<Email>(EMAILS_TABLE, fields);

  return response.records[0]
}

export async function updateEmail(
  recordId: string,
  fields: Partial<Email>
): Promise<AirtableRecord<Email>> {
  return await updateRecord<Email>(EMAILS_TABLE, recordId, fields);
}