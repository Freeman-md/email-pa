import { RateLimitError } from "@/shared/types";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRateLimitError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as RateLimitError;

  return (
    candidate.statusCode === 429 ||
    candidate.type === "rate_limit_exceeded" ||
    candidate.lastError?.statusCode === 429 ||
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
