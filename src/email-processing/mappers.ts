import { GraphMessage } from "@/integrations/microsoft-graph/types";
import {
    EmailRelevanceClassification,
    EmailStatusClassification,
    ProcessedEmail,
} from "@/email-processing/types";
import { limitText, normalizeWhitespace } from "@/shared/utils";
import { NormalizedEmail } from "@/email-processing/types";

const MAX_BODY_PREVIEW_LENGTH = 1000;

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
        Relevant: isRelevant,
        "Classification Confidence": classification.confidence,
        "Classification Evidence": classification.evidence.join(" | "),
    };
}

export function createStatusUpdateFields(
    classification: EmailStatusClassification
): Partial<ProcessedEmail> {
    return {
        Status: classification.status,
        "Classification Confidence": classification.confidence,
        "Classification Evidence": classification.evidence.join(" | "),
    };
}

export function normalizeEmail(message: GraphMessage): NormalizedEmail {
    return {
        messageId: message.id,
        subject: normalizeWhitespace(message.subject ?? ""),
        senderName: message.sender?.emailAddress?.name,
        senderAddress: message.sender?.emailAddress?.address,
        receivedAt: message.receivedDateTime,
        webLink: message.webLink,
        bodyPreview: limitText(
            normalizeWhitespace(message.bodyPreview ?? ""),
            MAX_BODY_PREVIEW_LENGTH
        ),
    };
}

export function normalizeEmails(messages: GraphMessage[]) {
    return messages.map(normalizeEmail);
}
