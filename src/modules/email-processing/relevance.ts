import { classifyEmailRelevance } from "@/modules/ai/relevance-classifier";
import {
  getProcessedEmail,
  updateProcessedEmail,
} from "@/modules/airtable/tables/processed-emails";
import { NormalizedEmail } from "@/shared/types/email";
import { AiRateLimitError } from "@/shared/types/ai";

const PER_EMAIL_DELAY_MS = 2000;
const COOLDOWN_EVERY_N_EMAILS = 10;
const COOLDOWN_DELAY_MS = 15000;
const RATE_LIMIT_COOLDOWN_MS = 30000;
const MAX_RATE_LIMIT_RETRIES = 2;

export type RelevanceStageResult = {
  reviewedCount: number;
  relevantCount: number;
  irrelevantCount: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as AiRateLimitError;

  return (
    candidate.statusCode === 429 ||
    candidate.type === "rate_limit_exceeded" ||
    candidate.lastError?.statusCode === 429 ||
    candidate.lastError?.type === "rate_limit_exceeded"
  );
}

async function classifyWithRateLimitCooldown(email: NormalizedEmail) {
  let attempt = 0;

  while (true) {
    try {
      return await classifyEmailRelevance(email);
    } catch (error) {
      const isRetryableRateLimit =
        isRateLimitError(error) && attempt < MAX_RATE_LIMIT_RETRIES;

      if (!isRetryableRateLimit) {
        throw error;
      }

      await sleep(RATE_LIMIT_COOLDOWN_MS);
      attempt += 1;
    }
  }
}

export async function classifyEmailRelevanceStage({
  emails,
}: {
  emails: NormalizedEmail[];
}): Promise<RelevanceStageResult> {
  let reviewedCount = 0;
  let relevantCount = 0;
  let irrelevantCount = 0;

  for (let index = 0; index < emails.length; index += 1) {
    const email = emails[index];
    const classification = await classifyWithRateLimitCooldown(email);
    const processedEmailRecord = await getProcessedEmail(email.messageId);

    if (!processedEmailRecord) {
      throw new Error(`Processed email record not found for ${email.messageId}`);
    }

    const isRelevant = classification.relevance.isRelevant;
    const processingStatus = isRelevant ? "relevant" : "irrelevant";

    await updateProcessedEmail(processedEmailRecord.id, {
      "Processing Status": processingStatus,
      Relevance: isRelevant ? "relevant" : "irrelevant",
      "Relevance Confidence": classification.relevance.confidence,
      "Relevance Evidence": classification.relevance.evidence.join(" | "),
      "Error Message": "",
    });

    reviewedCount += 1;

    if (isRelevant) {
      relevantCount += 1;
    } else {
      irrelevantCount += 1;
    }

    await sleep(PER_EMAIL_DELAY_MS);

    if ((index + 1) % COOLDOWN_EVERY_N_EMAILS === 0) {
      await sleep(COOLDOWN_DELAY_MS);
    }
  }

  return {
    reviewedCount,
    relevantCount,
    irrelevantCount,
  };
}