import { classifyEmailRelevance, classifyEmailStatus } from "@/email-processing/ai";
import {
  createRelevanceUpdateFields,
  createStatusUpdateFields,
} from "@/email-processing/mappers";
import {
  sleep,
  withRateLimitCooldown,
} from "@/shared/retry";
import {
  fetchMessageWithBody,
} from "@/integrations/microsoft-graph/service";
import {
  getProcessedEmail,
  updateProcessedEmail,
} from "@/integrations/airtable/processed-emails.repository";
import { NormalizedEmail } from "@/email-processing/types";
import { COOLDOWN_DELAY_MS, COOLDOWN_EVERY_N_EMAILS, MAX_RATE_LIMIT_RETRIES, PER_EMAIL_DELAY_MS, RATE_LIMIT_COOLDOWN_MS } from "@/shared/constants";
import { limitText, normalizeWhitespace } from "@/shared/utils";

const MAX_FULL_BODY_LENGTH = 8000;

export async function classifyEmailRelevanceStage({
  emails,
}: {
  emails: NormalizedEmail[];
}): Promise<{
  reviewedCount: number;
  relevantCount: number;
  irrelevantCount: number;
  relevantEmails: NormalizedEmail[];
}> {
  let relevantCount = 0;
  const relevantEmails: NormalizedEmail[] = [];

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
      relevantEmails.push(email);
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
    relevantEmails,
  };
}

async function enrichEmailWithFullBody(
  email: NormalizedEmail
): Promise<NormalizedEmail> {
  const fullMessage = await fetchMessageWithBody(email.messageId);

  return {
    ...email,
    body: limitText(
      normalizeWhitespace(fullMessage.body?.content ?? ""),
      MAX_FULL_BODY_LENGTH
    ),
  };
}

export async function classifyEmailStatusStage({
  emails,
}: {
  emails: NormalizedEmail[];
}): Promise<{
  reviewedCount: number;
  rejectionCount: number;
  interviewInvitationCount: number;
  assessmentCount: number;
  genericUpdateCount: number;
}> {
  let rejectionCount = 0;
  let interviewInvitationCount = 0;
  let assessmentCount = 0;
  let genericUpdateCount = 0;

  for (let index = 0; index < emails.length; index += 1) {
    const email = emails[index];
    const emailWithBody = await enrichEmailWithFullBody(email);
    const classification = await withRateLimitCooldown({
      cooldownMs: RATE_LIMIT_COOLDOWN_MS,
      maxRetries: MAX_RATE_LIMIT_RETRIES,
      operation: () => classifyEmailStatus(emailWithBody),
    });
    const processedEmailRecord = await getProcessedEmail(email.messageId);

    if (!processedEmailRecord) {
      throw new Error(`Processed email record not found for ${email.messageId}`);
    }

    await updateProcessedEmail(
      processedEmailRecord.id,
      createStatusUpdateFields(classification.status)
    );

    if (classification.status.status === "rejection") {
      rejectionCount += 1;
    } else if (classification.status.status === "interview_invitation") {
      interviewInvitationCount += 1;
    } else if (classification.status.status === "assessment") {
      assessmentCount += 1;
    } else {
      genericUpdateCount += 1;
    }

    await sleep(PER_EMAIL_DELAY_MS);

    if ((index + 1) % COOLDOWN_EVERY_N_EMAILS === 0) {
      await sleep(COOLDOWN_DELAY_MS);
    }
  }

  return {
    reviewedCount: emails.length,
    rejectionCount,
    interviewInvitationCount,
    assessmentCount,
    genericUpdateCount,
  };
}
