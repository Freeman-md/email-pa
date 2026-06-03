import { AirtableRecord, Email, GraphEmail } from "@/shared/types";

export function createGraphEmail(overrides: Partial<GraphEmail> = {}): GraphEmail {
  return {
    id: "graph-email-1",
    subject: "Test subject",
    receivedDateTime: "2026-06-03T10:00:00.000Z",
    webLink: "https://outlook.office.com/mail/test",
    bodyPreview: "Test preview",
    sender: {
      emailAddress: {
        name: "Test Sender",
        address: "sender@example.com",
      },
    },
    ...overrides,
  };
}

export function createEmail(overrides: Partial<Email> = {}): Email {
  return {
    message_id: "graph-email-1",
    subject: "Test subject",
    received_at: "2026-06-03T10:00:00.000Z",
    sender_name: "Test Sender",
    sender_address: "sender@example.com",
    web_link: "https://outlook.office.com/mail/test",
    body_preview: "Test preview",
    ...overrides,
  };
}

export function createEmailRecord(
  overrides: Partial<AirtableRecord<Email>> = {}
): AirtableRecord<Email> {
  return {
    id: "rec_test_1",
    fields: createEmail(),
    ...overrides,
  };
}