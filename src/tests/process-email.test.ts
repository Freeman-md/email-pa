import { classifyEmailRelevance, classifyEmailStatus, resolveJobRecord } from '@/integrations/ai/operations'
import { createEmail, deleteEmail, getEmail, updateEmail } from '@/integrations/airtable/repositories/emails'
import { createJob, updateJobStatus } from "@/integrations/airtable/repositories/jobs";
import { fetchEmailWithBody, markEmailAsRead } from '@/integrations/microsoft-graph/service'
import { processEmail } from "@/process-email";
import { createEmail as createEmailFixture, createEmailRecord, createGraphEmail } from "./fixtures/emails";
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock("@/integrations/airtable/repositories/emails", () => ({
    getEmail: vi.fn(),
    createEmail: vi.fn(),
    updateEmail: vi.fn(),
    deleteEmail: vi.fn()
}))

vi.mock("@/integrations/microsoft-graph/service", () => ({
    fetchEmailWithBody: vi.fn(),
    markEmailAsRead: vi.fn(),
    markEmailAsUnread: vi.fn()
}))

vi.mock("@/integrations/ai/operations", () => ({
    classifyEmailRelevance: vi.fn(),
    classifyEmailStatus: vi.fn(),
    resolveJobRecord: vi.fn(),
}))

vi.mock("@/integrations/airtable/repositories/jobs", () => ({
    createJob: vi.fn(),
    updateJobStatus: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveJobRecord).mockResolvedValue({
        action: "skip",
        status: null,
        target_record_id: null,
        job_title: null,
        company_name: null,
    });
});

describe("processEmail", () => {
    it("deletes a newly created record when processing fails before completion", async () => {
        const graphEmail = createGraphEmail()
        const createdRecord = createEmailRecord()

        vi.mocked(getEmail).mockResolvedValue(null)
        vi.mocked(createEmail).mockResolvedValue(createdRecord)
        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture(),
            relevance: {
                isRelevant: true,
                confidence: 'high',
                evidence: ["job application email"]
            }
        })
        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Full email body",
            },
        });
        vi.mocked(classifyEmailStatus).mockRejectedValue(
            new Error("Status classification failed")
        );

        await expect(processEmail(graphEmail)).rejects.toThrow(
            "Status classification failed"
        );

        expect(deleteEmail).toHaveBeenCalledWith(createdRecord.id);
    })

    it("does not delete a pre-existing record when processing fails", async () => {
        const graphEmail = createGraphEmail();
        const existingRecord = createEmailRecord();

        vi.mocked(getEmail).mockResolvedValue(existingRecord);
        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture(),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application email"],
            },
        });
        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Full email body",
            },
        });
        vi.mocked(classifyEmailStatus).mockRejectedValue(
            new Error("Status classification failed")
        );

        await expect(processEmail(graphEmail)).rejects.toThrow(
            "Status classification failed"
        );

        expect(createEmail).not.toHaveBeenCalled();
        expect(deleteEmail).not.toHaveBeenCalled();
    });

    it("retries on a retryable failure and then succeeds", async () => {
        const graphEmail = createGraphEmail();
        const firstRecord = createEmailRecord({ id: "rec_first" });
        const secondRecord = createEmailRecord({ id: "rec_second" });
        const updatedRecord = createEmailRecord({
            id: "rec_second",
            fields: createEmailFixture({ status: "rejection" }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);

        vi.mocked(createEmail)
            .mockResolvedValueOnce(firstRecord)
            .mockResolvedValueOnce(secondRecord);

        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture(),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application email"],
            },
        });

        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Full email body",
            },
        });

        vi.mocked(classifyEmailStatus)
            .mockRejectedValueOnce(new Error("Graph request failed: 500 internal error"))
            .mockResolvedValueOnce({
                email: createEmailFixture(),
                status: {
                    status: "rejection",
                    confidence: "high",
                    evidence: ["rejection wording"],
                },
            });

        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);
        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        const result = await processEmail(graphEmail);

        expect(result).toEqual(updatedRecord.fields);
        expect(createEmail).toHaveBeenCalledTimes(2);
        expect(classifyEmailStatus).toHaveBeenCalledTimes(2);
        expect(deleteEmail).toHaveBeenCalledWith(firstRecord.id);
        expect(updateEmail).toHaveBeenCalledWith(
            secondRecord.id,
            expect.objectContaining({ status: "rejection" })
        );
    });

    it("does not retry on a non-retryable failure", async () => {
        const graphEmail = createGraphEmail();
        const createdRecord = createEmailRecord({ id: "rec_first" });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);

        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture(),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application email"],
            },
        });

        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Full email body",
            },
        });

        vi.mocked(classifyEmailStatus).mockRejectedValue(
            new Error(
                'Graph request failed: 403 {"error":{"code":"ErrorAccessDenied","message":"Access is denied. Check credentials and try again."}}'
            )
        );

        await expect(processEmail(graphEmail)).rejects.toThrow("403");

        expect(createEmail).toHaveBeenCalledTimes(1);
        expect(classifyEmailStatus).toHaveBeenCalledTimes(1);
        expect(deleteEmail).toHaveBeenCalledWith(createdRecord.id);
    });

    it("does not roll back persisted classification when mark-as-read fails", async () => {
        const graphEmail = createGraphEmail();
        const createdRecord = createEmailRecord({ id: "rec_created" });
        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({ status: "rejection" }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);

        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture(),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application email"],
            },
        });

        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Full email body",
            },
        });

        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture(),
            status: {
                status: "rejection",
                confidence: "high",
                evidence: ["rejection wording"],
            },
        });

        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);

        vi.mocked(markEmailAsRead).mockRejectedValue(
            new Error(
                'Graph request failed: 403 {"error":{"code":"ErrorAccessDenied","message":"Access is denied. Check credentials and try again."}}'
            )
        );

        const result = await processEmail(graphEmail);

        expect(result).toEqual(updatedRecord.fields);
        expect(updateEmail).toHaveBeenCalled();
        expect(markEmailAsRead).toHaveBeenCalledTimes(1);
        expect(deleteEmail).not.toHaveBeenCalled();
    });

    it("processes a relevant email end to end and persists the final status", async () => {
        const graphEmail = createGraphEmail();

        const createdRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({ message_id: graphEmail.id }),
        });

        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: "rejection",
                classification_confidence: "high",
                classification_evidence: "rejection wording",
            }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);

        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application email"],
            },
        });

        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Full email body",
            },
        });

        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            status: {
                status: "rejection",
                confidence: "high",
                evidence: ["rejection wording"],
            },
        });

        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);
        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        const result = await processEmail(graphEmail);

        expect(result).toEqual(updatedRecord.fields);

        expect(getEmail).toHaveBeenCalledWith(graphEmail.id);
        expect(createEmail).toHaveBeenCalledTimes(1);
        expect(classifyEmailRelevance).toHaveBeenCalledTimes(1);
        expect(fetchEmailWithBody).toHaveBeenCalledWith(graphEmail.id);
        expect(classifyEmailStatus).toHaveBeenCalledTimes(1);
        expect(updateEmail).toHaveBeenCalledWith(
            createdRecord.id,
            expect.objectContaining({
                status: "rejection",
                classification_confidence: "high",
                classification_evidence: "rejection wording",
            })
        );
        expect(markEmailAsRead).toHaveBeenCalledWith(graphEmail.id);
        expect(deleteEmail).not.toHaveBeenCalled();
    });

    it("creates a job record for a generic update resolved as Applied", async () => {
        const graphEmail = createGraphEmail({
            id: "gen-001",
            subject: "Thank you for applying for Platform Backend Engineer",
        });

        const createdRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: undefined,
            }),
        });

        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: "generic_update",
                body: "Thank you for applying for the Platform Backend Engineer role at Astera Grid.",
            }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);

        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application confirmation"],
            },
        });

        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content:
                    "Thank you for applying for the Platform Backend Engineer role at Astera Grid.",
            },
        });

        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            status: {
                status: "generic_update",
                confidence: "high",
                evidence: ["thank you for applying"],
            },
        });

        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);

        vi.mocked(resolveJobRecord).mockResolvedValue({
            action: "create",
            status: "Applied",
            target_record_id: null,
            job_title: "Platform Backend Engineer",
            company_name: "Astera Grid",
        });

        vi.mocked(createJob).mockResolvedValue({
            id: "rec_job_1",
            fields: {
                job_title: "Platform Backend Engineer",
                company_name: "Astera Grid",
                status: "Applied",
            },
        });

        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        const result = await processEmail(graphEmail);

        expect(result).toEqual(updatedRecord.fields);

        expect(resolveJobRecord).toHaveBeenCalledWith({
            subject: updatedRecord.fields.subject,
            sender_name: updatedRecord.fields.sender_name,
            sender_address: updatedRecord.fields.sender_address,
            body: updatedRecord.fields.body,
            body_preview: updatedRecord.fields.body_preview,
            status: updatedRecord.fields.status,
        });

        expect(createJob).toHaveBeenCalledWith({
            job_title: "Platform Backend Engineer",
            company_name: "Astera Grid",
            status: "Applied",
        });

        expect(updateJobStatus).not.toHaveBeenCalled();
    });

    it("does not create or update a job record for a generic update resolved as skip", async () => {
        const graphEmail = createGraphEmail({
            id: "gen-002",
            subject: "Application received for Senior Data Platform Engineer",
        });

        const createdRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({ message_id: graphEmail.id }),
        });

        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: "generic_update",
                subject: graphEmail.subject,
                body: "We have received your application and will review it shortly.",
            }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);
        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["application update email"],
            },
        });
        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "We have received your application and will review it shortly.",
            },
        });
        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            status: {
                status: "generic_update",
                confidence: "high",
                evidence: ["application received"],
            },
        });
        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);
        vi.mocked(resolveJobRecord).mockResolvedValue({
            action: "skip",
            status: null,
            target_record_id: null,
            job_title: null,
            company_name: null,
        });
        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        const result = await processEmail(graphEmail);

        expect(result).toEqual(updatedRecord.fields);
        expect(createJob).not.toHaveBeenCalled();
        expect(updateJobStatus).not.toHaveBeenCalled();
    });

    it("updates an existing job record for assessment emails", async () => {
        const graphEmail = createGraphEmail({
            id: "ass-001",
            subject: "Platform Backend Engineer assessment invitation",
        });

        const createdRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({ message_id: graphEmail.id }),
        });

        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: "assessment",
                subject: graphEmail.subject,
                body: "Please complete the assessment for the Platform Backend Engineer role.",
            }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);
        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["job application assessment"],
            },
        });
        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "Please complete the assessment for the Platform Backend Engineer role.",
            },
        });
        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            status: {
                status: "assessment",
                confidence: "high",
                evidence: ["complete the assessment"],
            },
        });
        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);
        vi.mocked(resolveJobRecord).mockResolvedValue({
            action: "update",
            status: "Assessment",
            target_record_id: "rec_job_1",
            job_title: null,
            company_name: null,
        });
        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        await processEmail(graphEmail);

        expect(updateJobStatus).toHaveBeenCalledWith("rec_job_1", "Assessment");
        expect(createJob).not.toHaveBeenCalled();
    });

    it("updates an existing job record for interview invitation emails", async () => {
        const graphEmail = createGraphEmail({
            id: "int-001",
            subject: "Interview invitation for Platform Backend Engineer",
        });

        const createdRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({ message_id: graphEmail.id }),
        });

        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: "interview_invitation",
                subject: graphEmail.subject,
                body: "We would like to schedule an interview with you next week.",
            }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);
        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["interview scheduling email"],
            },
        });
        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "We would like to schedule an interview with you next week.",
            },
        });
        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            status: {
                status: "interview_invitation",
                confidence: "high",
                evidence: ["schedule an interview"],
            },
        });
        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);
        vi.mocked(resolveJobRecord).mockResolvedValue({
            action: "update",
            status: "Interviewing",
            target_record_id: "rec_job_2",
            job_title: null,
            company_name: null,
        });
        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        await processEmail(graphEmail);

        expect(updateJobStatus).toHaveBeenCalledWith("rec_job_2", "Interviewing");
        expect(createJob).not.toHaveBeenCalled();
    });

    it("updates an existing job record for rejection emails", async () => {
        const graphEmail = createGraphEmail({
            id: "rej-001",
            subject: "Update on your Platform Backend Engineer application",
        });

        const createdRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({ message_id: graphEmail.id }),
        });

        const updatedRecord = createEmailRecord({
            id: "rec_created",
            fields: createEmailFixture({
                message_id: graphEmail.id,
                status: "rejection",
                subject: graphEmail.subject,
                body: "We have decided not to move forward with your application.",
            }),
        });

        vi.mocked(getEmail).mockResolvedValue(null);
        vi.mocked(createEmail).mockResolvedValue(createdRecord);
        vi.mocked(classifyEmailRelevance).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            relevance: {
                isRelevant: true,
                confidence: "high",
                evidence: ["rejection email"],
            },
        });
        vi.mocked(fetchEmailWithBody).mockResolvedValue({
            ...graphEmail,
            body: {
                contentType: "text",
                content: "We have decided not to move forward with your application.",
            },
        });
        vi.mocked(classifyEmailStatus).mockResolvedValue({
            email: createEmailFixture({ message_id: graphEmail.id }),
            status: {
                status: "rejection",
                confidence: "high",
                evidence: ["not move forward"],
            },
        });
        vi.mocked(updateEmail).mockResolvedValue(updatedRecord);
        vi.mocked(resolveJobRecord).mockResolvedValue({
            action: "update",
            status: "Rejection",
            target_record_id: "rec_job_3",
            job_title: null,
            company_name: null,
        });
        vi.mocked(markEmailAsRead).mockResolvedValue(undefined);

        await processEmail(graphEmail);

        expect(updateJobStatus).toHaveBeenCalledWith("rec_job_3", "Rejection");
        expect(createJob).not.toHaveBeenCalled();
    });
})
