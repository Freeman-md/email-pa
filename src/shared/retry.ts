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

export async function withRateLimitCooldown<T>({
  operation,
  cooldownMs,
  maxRetries,
}: {
  operation: () => Promise<T>;
  cooldownMs: number;
  maxRetries: number;
}): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const isRetryableRateLimit =
        isRateLimitError(error) && attempt < maxRetries;

      if (!isRetryableRateLimit) {
        throw error;
      }

      await sleep(cooldownMs);
      attempt += 1;
    }
  }
}
