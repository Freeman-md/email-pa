import { escapeAirtableString } from "@/shared/utils";
import { createRecords, listRecords, updateRecord } from "@/integrations/airtable/client";
import { ProcessedEmail } from "@/email-processing/types";
import { AirtableRecord } from "@/integrations/airtable/types";

const PROCESSED_EMAILS_TABLE = "Processed Emails"

async function getProcessedEmail(messageId: string): Promise<AirtableRecord<ProcessedEmail> | null> {
  const formula = encodeURIComponent(
    `{Message ID}='${escapeAirtableString(messageId)}'`
  );

  const response = await listRecords<ProcessedEmail>(
    PROCESSED_EMAILS_TABLE,
    `?filterByFormula=${formula}&maxRecords=1`
  )

  return response.records[0] ?? null
}

export async function createProcessedEmail(fields: ProcessedEmail): Promise<AirtableRecord<ProcessedEmail>> {
  const response = await createRecords<ProcessedEmail>(PROCESSED_EMAILS_TABLE, fields);

  return response.records[0]
}

export async function updateProcessedEmail(
  recordId: string,
  fields: Partial<ProcessedEmail>
): Promise<AirtableRecord<ProcessedEmail>> {
  return await updateRecord<ProcessedEmail>(PROCESSED_EMAILS_TABLE, recordId, fields);
}