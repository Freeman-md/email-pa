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

export type GraphMessage = {
  id: string;
  subject?: string;
  sender?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  receivedDateTime?: string;
  webLink?: string;
  bodyPreview?: string;
  body?: {
    contentType?: "text" | "html";
    content?: string;
  };
};
