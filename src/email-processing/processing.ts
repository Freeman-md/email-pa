import { classifyEmailRelevance, classifyEmailStatus } from "@/email-processing/ai/classification";
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

async function runClassificationStage<T>({
  emails,
  classify,
  updateRecord,
  onResult,
}: {
  emails: NormalizedEmail[];
  classify: (email: NormalizedEmail) => Promise<T>;
  updateRecord: (recordId: string, result: T) => Promise<unknown>;
  onResult: (email: NormalizedEmail, result: T) => void;
}) {
  for (let index = 0; index < emails.length; index += 1) {
    const email = emails[index];

    const result = await withRateLimitCooldown({
      cooldownMs: RATE_LIMIT_COOLDOWN_MS,
      maxRetries: MAX_RATE_LIMIT_RETRIES,
      operation: () => classify(email),
    });

    const processedEmailRecord = await getProcessedEmail(email.messageId);

    if (!processedEmailRecord) {
      throw new Error(`Processed email record not found for ${email.messageId}`);
    }

    await updateRecord(processedEmailRecord.id, result);
    onResult(email, result);

    await sleep(PER_EMAIL_DELAY_MS);

    if ((index + 1) % COOLDOWN_EVERY_N_EMAILS === 0) {
      await sleep(COOLDOWN_DELAY_MS);
    }
  }
}

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

  await runClassificationStage({
    emails,
    classify: classifyEmailRelevance,
    updateRecord: (recordId, result) =>
      updateProcessedEmail(
        recordId,
        createRelevanceUpdateFields(result.relevance)
      ),
    onResult: (email, result) => {
      if (result.relevance.isRelevant) {
        relevantCount += 1;
        relevantEmails.push(email);
      }
    },
  });

  return {
    reviewedCount: emails.length,
    relevantCount,
    irrelevantCount: emails.length - relevantCount,
    relevantEmails,
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

  await runClassificationStage({
    emails,
    classify: async (email) => {
      const emailWithBody = await enrichEmailWithFullBody(email);
      return classifyEmailStatus(emailWithBody);
    },
    updateRecord: (recordId, result) =>
      updateProcessedEmail(recordId, createStatusUpdateFields(result.status)),
    onResult: (_, result) => {
      if (result.status.status === "rejection") {
        rejectionCount += 1;
      } else if (result.status.status === "interview_invitation") {
        interviewInvitationCount += 1;
      } else if (result.status.status === "assessment") {
        assessmentCount += 1;
      } else {
        genericUpdateCount += 1;
      }
    },
  });

  return {
    reviewedCount: emails.length,
    rejectionCount,
    interviewInvitationCount,
    assessmentCount,
    genericUpdateCount,
  };
}
