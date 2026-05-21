export type ProcessedEmail = {
  "Message ID": string;
  "Received At"?: string;
  Subject?: string;
  Sender?: string;
  "Run ID": string;
  "Processed At": string;
  "Processing Status"?: string;
  Relevance?: string;
  "Relevance Confidence"?: string;
  "Relevance Evidence"?: string;
  Status?: string;
  "Status Confidence"?: string;
  "Status Evidence"?: string;
  "Error Message"?: string;
};

export type NormalizedEmail = {
  messageId: string;
  subject: string;
  senderName?: string;
  senderAddress?: string;
  receivedAt?: string;
  webLink?: string;
  bodyPreview: string;
  body?: string;
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
  email: NormalizedEmail;
  relevance: EmailRelevanceClassification;
};

export type ClassifiedEmailStatus = {
  email: NormalizedEmail;
  status: EmailStatusClassification;
};
