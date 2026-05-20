import { classifyEmailRelevance } from "@/email-processing/classifiers/relevance";
import { createRelevanceUpdateFields } from "@/email-processing/state";
import {
  sleep,
  withRateLimitCooldown,
} from "@/integrations/ai/execution";
import {
  getProcessedEmail,
  updateProcessedEmail,
} from "@/integrations/airtable/tables/processed-emails";
import { NormalizedEmail } from "@/email-processing/types";

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
    const classification = await withRateLimitCooldown({
      cooldownMs: RATE_LIMIT_COOLDOWN_MS,
      maxRetries: MAX_RATE_LIMIT_RETRIES,
      operation: () => classifyEmailRelevance(email),
    });
    const processedEmailRecord = await getProcessedEmail(email.messageId);

    if (!processedEmailRecord) {
      throw new Error(`Processed email record not found for ${email.messageId}`);
    }

    await updateProcessedEmail(
      processedEmailRecord.id,
      createRelevanceUpdateFields(classification.relevance)
    );

    reviewedCount += 1;

    const isRelevant = classification.relevance.isRelevant;

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
