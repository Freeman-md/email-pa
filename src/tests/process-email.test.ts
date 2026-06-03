import { classifyEmailRelevance, classifyEmailStatus } from '@/integrations/ai/classification'
import { createEmail, deleteEmail, getEmail, updateEmail } from '@/integrations/airtable/repositories/emails'
import { fetchEmailWithBody, markEmailAsRead, markEmailAsUnread } from '@/integrations/microsoft-graph/service'
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
    it("runs the test suite", () => {
        expect(true).toBe(true)
    })
})