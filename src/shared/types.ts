export type AiRateLimitError = {
  statusCode?: number;
  type?: string;
  lastError?: {
    statusCode?: number;
    type?: string;
  };
};
