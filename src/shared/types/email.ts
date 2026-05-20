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

export type GraphMessagesResponse = {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
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