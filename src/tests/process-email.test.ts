import { classifyEmailRelevance, classifyEmailStatus } from '@/integrations/ai/classification'
import { createEmail, deleteEmail, getEmail, updateEmail } from '@/integrations/airtable/repositories/emails'
import { fetchEmailWithBody, markEmailAsRead, markEmailAsUnread } from '@/integrations/microsoft-graph/service'
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

vi.mock("@/integrations/ai/classification", () => ({
    classifyEmailRelevance: vi.fn(),
    classifyEmailStatus: vi.fn()
}))

beforeEach(() => {
    vi.clearAllMocks();
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
})