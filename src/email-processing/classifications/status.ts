import { z } from "zod";
import {
  ClassifiedEmailStatus,
  EmailStatusClassification,
  NormalizedEmail,
} from "@/email-processing/types";
import { getAiConfig } from "@/integrations/ai/config";
import { generateText, Output } from "ai";

const statusSchema = z.object({
  status: z.enum([
    "rejection",
    "interview_invitation",
    "assessment",
    "generic_update",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string()).max(3),
});

function buildPrompt(email: NormalizedEmail) {
  return [
    `Subject: ${email.subject || "(none)"}`,
    `Sender Name: ${email.senderName || "(unknown)"}`,
    `Sender Address: ${email.senderAddress || "(unknown)"}`,
    `Received At: ${email.receivedAt || "(unknown)"}`,
    `Body Preview: ${email.bodyPreview || "(none)"}`,
    `Full Body: ${email.body || "(none)"}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `
You are an email status classifier for job-application related emails.

Your task is to classify one relevant email into exactly one of these statuses:

- rejection
- interview_invitation
- assessment
- generic_update

You must follow the provided structured output schema exactly.
Do not return markdown.
Do not return free-form prose outside the schema.
Do not add fields that are not in the schema.

Status definitions:

- rejection:
  The email clearly says the candidate will not move forward, was unsuccessful, was not selected, or the process has ended negatively.

- interview_invitation:
  The email invites the candidate to an interview, screening call, recruiter call, technical interview, hiring manager conversation, final interview, or asks them to schedule/select a time for such a live conversation.

- assessment:
  The email asks the candidate to complete a test, assignment, coding challenge, questionnaire, task, video interview, AI interview, psychometric test, or other evaluation step.

- generic_update:
  Any relevant email that does not clearly fit the other three statuses.
  Examples:
  application received
  thank you for applying
  under review
  profile completion
  incomplete application reminder
  talent community follow-up
  process update without rejection, interview invitation, or assessment request

Decision rules:

1. Output exactly one status.
2. Use the strongest explicit process signal in the email.
3. If the email clearly rejects the candidate, classify as rejection.
4. If the email clearly asks the candidate to complete an evaluation step, classify as assessment.
5. If the email clearly invites or schedules a live conversation, classify as interview_invitation.
6. If none of the above are clearly true, classify as generic_update.
7. Do not infer meaning from a positive or negative tone alone.
8. Ignore signatures, branding, legal text, unsubscribe text, and other non-decision content.
9. Use the subject and body together.
10. Be conservative. If uncertain between a specific class and generic_update, prefer generic_update.

Confidence rules:

- high:
  Clear, explicit language strongly supports the chosen status.
- medium:
  The status is likely correct, but the wording is less direct or slightly ambiguous.
- low:
  Weak or ambiguous evidence; choose this only when the email is still best classified under one status but certainty is limited.

Evidence rules:

- Provide up to 3 short evidence strings.
- Evidence should be brief quoted phrases or very short paraphrases from the email.
- Include only the strongest supporting signals.

Important classification guidance:

- "We will not be moving forward" -> rejection
- "Please book a time for your interview" -> interview_invitation
- "Complete this assessment" -> assessment
- "We received your application" -> generic_update
- "Your application is incomplete" -> generic_update
- "Join our talent community" or profile setup messages tied to an application -> generic_update

The email has already been determined to be relevant to job applications.
Your only job is to classify its status using the structured output schema.
`;

export async function classifyEmailStatus(
  email: NormalizedEmail
): Promise<ClassifiedEmailStatus> {
  const { classification } = getAiConfig();

  const result = await generateText({
    model: classification.model,
    temperature: classification.temperature,
    maxOutputTokens: classification.maxOutputTokens,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(email),
    output: Output.object({
      schema: statusSchema,
    }),
  });

  return {
    email,
    status: result.output as EmailStatusClassification,
  };
}
