import { RateLimitError } from "./types";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as RateLimitError;

  return (
    candidate.status === 429 ||
    candidate.statusCode === 429 ||
    candidate.code === "rate_limit_exceeded" ||
    candidate.type === "rate_limit_exceeded" ||
    candidate.error?.code === "rate_limit_exceeded" ||
    candidate.error?.type === "rate_limit_exceeded" ||
    candidate.lastError?.status === 429 ||
    candidate.lastError?.statusCode === 429 ||
    candidate.lastError?.code === "rate_limit_exceeded" ||
    candidate.lastError?.error?.code === "rate_limit_exceeded" ||
    candidate.lastError?.error?.type === "rate_limit_exceeded" ||
    candidate.lastError?.type === "rate_limit_exceeded"
  );
}

export function getHttpStatusFromError(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/\b(\d{3})\b/);

  return match ? Number(match[1]) : null;
}

export function isRetryableProcessingError(error: unknown) {
  if (error instanceof TypeError) {
    return true;
  }

  if (isRateLimitError(error)) {
    return true;
  }

  const status = getHttpStatusFromError(error);

  return status !== null && status >= 500;
}

export async function withRetryCooldown<T>({
  operation,
  cooldownMs,
  maxRetries,
  shouldRetry,
  onRetry,
}: {
  operation: () => Promise<T>;
  cooldownMs: number;
  maxRetries: number;
  shouldRetry: (error: unknown) => boolean;
  onRetry?: (details: { attempt: number; error: unknown }) => void;
}): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const retryable = shouldRetry(error) && attempt < maxRetries;

      if (!retryable) {
        throw error;
      }

      attempt += 1;
      onRetry?.({ attempt, error });
      await sleep(cooldownMs);
    }
  }
}