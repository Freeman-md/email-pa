type TelegramSendMessageInput = {
  text: string;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  description?: string;
};