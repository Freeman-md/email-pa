import { classifyEmailRelevance } from "@/email-processing/classifications/relevance";
import { createRelevanceUpdateFields } from "@/email-processing/mappers";
import {
  sleep,
  withRateLimitCooldown,
} from "@/integrations/ai/execution";
import {
  getProcessedEmail,
  updateProcessedEmail,
} from "@/integrations/airtable/processed-emails.repository";
import { NormalizedEmail } from "@/email-processing/types";
import { COOLDOWN_DELAY_MS, COOLDOWN_EVERY_N_EMAILS, MAX_RATE_LIMIT_RETRIES, PER_EMAIL_DELAY_MS, RATE_LIMIT_COOLDOWN_MS } from "@/shared/constants";

export async function classifyEmailRelevanceStage({
  emails,
}: {
  emails: NormalizedEmail[];
}): Promise<{
  reviewedCount: number;
  relevantCount: number;
  irrelevantCount: number;
}> {
  let relevantCount = 0;

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

    if (classification.relevance.isRelevant) {
      relevantCount += 1;
    }

    await sleep(PER_EMAIL_DELAY_MS);

    if ((index + 1) % COOLDOWN_EVERY_N_EMAILS === 0) {
      await sleep(COOLDOWN_DELAY_MS);
    }
  }

  return {
    reviewedCount: emails.length,
    relevantCount,
    irrelevantCount: emails.length - relevantCount,
  };
}
