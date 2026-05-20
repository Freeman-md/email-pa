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
};

export type EmailRelevanceClassification = {
  isRelevant: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

export type ClassifiedEmailRelevance = {
  email: NormalizedEmail;
  relevance: EmailRelevanceClassification;
};
