export type Email = {
  "Message ID": string;
  "Received At"?: string;
  Subject?: string;
  "Sender Name"?: string;
  "Sender Address"?: string;
  "Web Link"?: string;
  "Created At"?: string;
  Status?: "rejection" | "interview_invitation" | "assessment" | "generic_update" | "irrelevant";
  "Classification Confidence"?: string;
  "Classification Evidence"?: string; 
} & {
  "Body Preview"?: string;
  "Body"?: string
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
