export type AppSetting = {
  Key: string;
  Value?: string;
  "Updated At"?: string;
};

export type Email = {
  message_id: string;
  received_at?: string;
  subject?: string;
  sender_name?: string;
  sender_address?: string;
  web_link?: string;
  created_at?: string;
  Status?: "rejection" | "interview_invitation" | "assessment" | "generic_update" | "irrelevant";
  classification_confidence?: string;
  classification_evidence?: string;
} & {
  body_preview?: string;
  body?: string
};

export type AirtableRecord<T extends Record<string, unknown>> = {
  id: string;
  fields: T;
};

export type AirtableMultiRecordsResponse<T extends Record<string, unknown>> = {
  records: AirtableRecord<T>[];
};

export type AirtableSingleRecordResponse<T extends Record<string, unknown>> =
  AirtableRecord<T>;


export type GraphEmail = {
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

export type GraphEmailsResponse = {
  value: GraphEmail[];
  "@odata.nextLink"?: string;
};

export type EmailRelevanceClassification = {
  isRelevant: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

export type EmailStatusClassification = {
  status:
  | "rejection"
  | "interview_invitation"
  | "assessment"
  | "generic_update";
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

export type ClassifiedEmailRelevance = {
  email: Email;
  relevance: EmailRelevanceClassification;
};

export type ClassifiedEmailStatus = {
  email: Email;
  status: EmailStatusClassification;
};


export type RateLimitError = {
  status?: number;
  statusCode?: number;
  code?: string;
  type?: string;
  error?: {
    code?: string;
    type?: string;
  };
  lastError?: {
    status?: number;
    statusCode?: number;
    code?: string;
    type?: string;
    error?: {
      code?: string;
      type?: string;
    };
  };
};
