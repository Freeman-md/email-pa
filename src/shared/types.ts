export type RateLimitError = {
  status?: number;
  statusCode?: number;
  code?: string;
  type?: string;
  error?: {
    code?: string;
    type?: string;
  };
  lastError?: {
    status?: number;
    statusCode?: number;
    code?: string;
    type?: string;
    error?: {
      code?: string;
      type?: string;
    };
  };
};
