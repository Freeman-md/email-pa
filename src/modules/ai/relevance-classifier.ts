import { ClassifiedEmailRelevance, EmailRelevanceClassification, NormalizedEmail } from "@/shared/types/email"
import { z } from "zod"
import { getAiConfig } from "./config";
import { generateText, Output } from "ai";
import { chunkArray } from "@/shared/utils";

const relevanceSchema = z.object({
    isRelevant: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.array(z.string()).max(3)
})

function buildPrompt(email: NormalizedEmail) {
    return [
        `Subject: ${email.subject || "(none)"}`,
        `Sender Name: ${email.senderName || "(unknown)"}`,
        `Sender Address: ${email.senderAddress || "(unknown)"}`,
        `Received At: ${email.receivedAt || "(unknown)"}`,
        `Body Preview: ${email.bodyPreview || "(none)"}`,
    ].join("\n");
}

const SYSTEM_PROMPT = `
You classify whether an email is part of a real job application pipeline.

Mark as RELEVANT only if the email is directly tied to a specific job application, candidate evaluation, or hiring process.

Relevant examples:
- application confirmations or acknowledgements
- recruiter outreach tied to a specific role
- interview scheduling or invitations
- assessments, take-home tasks, or screening requests
- requests for additional application information
- hiring status updates
- rejection emails
- offer-stage communication

Mark as IRRELEVANT if the email is generic, promotional, automated, informational, or unrelated to an active candidacy.

Irrelevant examples:
- job alerts or recommended jobs
- newsletters or hiring digests
- recruiting campaigns sent in bulk
- career advice content
- marketing or platform engagement emails
- account/security notifications
- social network notifications
- company announcements
- broad “we’re hiring” outreach without role-specific context

Be strict. Mentioning jobs, careers, hiring, or recruiters alone does NOT make an email relevant.

Output only structured data.

Evidence must be:
- short
- verbatim or near-verbatim phrases from the email
- concrete and decision-relevant
- not paraphrased summaries

Do not explain reasoning outside the structured output.
`

export async function classifyEmailRelevance(
    email: NormalizedEmail
): Promise<ClassifiedEmailRelevance> {
    const { classification } = getAiConfig();

    const result = await generateText({
        model: classification.model,
        temperature: classification.temperature,
        maxOutputTokens: classification.maxOutputTokens,
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(email),
        output: Output.object({
            schema: relevanceSchema,
        }),
    });

    return {
        email,
        relevance: result.output as EmailRelevanceClassification,
    };
}