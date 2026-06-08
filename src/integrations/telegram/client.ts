import { getTelegramConfig } from "@/config/telegram";
import {
  TelegramSendMessageInput,
  TelegramSendMessageResponse,
} from "@/shared/types";

export async function sendTelegramMessage({
  text,
}: TelegramSendMessageInput) {
  const { botToken, chatId } = getTelegramConfig();

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    }
  );

  const data =
    (await response.json()) as TelegramSendMessageResponse;

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description ?? "Failed to send Telegram message"
    );
  }

  return data.result;
}
