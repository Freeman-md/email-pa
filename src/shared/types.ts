export type RateLimitError = {
  statusCode?: number;
  type?: string;
  lastError?: {
    statusCode?: number;
    type?: string;
  };
};
