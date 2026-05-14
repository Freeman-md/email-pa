export type AirtableRecord<T extends Record<string, unknown>> = {
    id: string;
    fields: T
}

export type AppSettings = {
  Key: string,
  Value?: string,
  "Updated At"?: string;

}

export type AirtableMultiRecordsResponse<T extends Record<string, unknown>> = {
  records: AirtableRecord<T>[];
};

export type AirtableSingleRecordResponse<T extends Record<string, unknown>> = AirtableRecord<T>