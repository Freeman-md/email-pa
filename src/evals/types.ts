import { Email } from "@/shared/types";

export type GraphEmailCsvRow = {
  id: string;
  subject: string;
  sender_name: string;
  sender_address: string;
  received_datetime: string;
  web_link: string;
  body_preview: string;
  body: string;
};

export type AnnotatedEmailCsvRow = Pick<Email, "message_id" | "status">;

export type ProcessedEmailCsvRow = Pick<Email, "message_id" | "status">;