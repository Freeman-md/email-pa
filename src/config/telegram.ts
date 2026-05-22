import { required } from "./helpers";

export function getTelegramConfig() {
    return {
        botToken: required("TELEGRAM_BOT_TOKEN"),
        chatId: required("TELEGRAM_CHAT_ID")
    }
}