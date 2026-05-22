export type ProcessedEmail = {
  "Message ID": string;
  "Received At"?: string;
  Subject?: string;
  Sender?: string;
  "Run ID": string;
  "Processed At": string;
  Relevant?: boolean;
  Status?: "rejection" | "interview_invitation" | "assessment" | "generic_update";
  "Classification Confidence"?: string;
  "Classification Evidence"?: string;
};

export type NormalizedEmail = {
  messageId: string;
  subject: string;
  senderName?: string;
  senderAddress?: string;
  receivedAt?: string;
  webLink?: string;
  bodyPreview?: string;
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
