import { GraphMessage } from "@/integrations/microsoft-graph/types";
import {
  EmailRelevanceClassification,
  ProcessedEmail,
} from "@/email-processing/types";

function getSenderAddress(message: GraphMessage) {
  return message.sender?.emailAddress?.address ?? "";
}

export function createProcessedEmailFields({
  message,
  runId,
  processedAt,
}: {
  message: GraphMessage;
  runId: string;
  processedAt: string;
}): ProcessedEmail {
  return {
    "Message ID": message.id,
    "Received At": message.receivedDateTime,
    Subject: message.subject,
    Sender: getSenderAddress(message),
    "Run ID": runId,
    "Processed At": processedAt,
  };
}

export function createRelevanceUpdateFields(
  classification: EmailRelevanceClassification
): Partial<ProcessedEmail> {
  const isRelevant = classification.isRelevant;

  return {
    "Processing Status": isRelevant ? "relevant" : "irrelevant",
    Relevance: isRelevant ? "relevant" : "irrelevant",
    "Relevance Confidence": classification.confidence,
    "Relevance Evidence": classification.evidence.join(" | "),
    "Error Message": "",
  };
}
