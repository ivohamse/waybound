const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_BACKOFF_FACTOR = 2;

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

export function parseRetryAfter(
  value: string | null,
  nowMs: number = Date.now(),
): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) return undefined;

  return Math.max(0, retryAt - nowMs);
}

export function getRetryDelay(
  retryIndex: number,
  retryAfterMs?: number,
): number {
  if (retryAfterMs !== undefined) {
    return retryAfterMs;
  }

  const exponentialDelay = Math.min(
    DEFAULT_INITIAL_DELAY_MS *
      Math.pow(DEFAULT_BACKOFF_FACTOR, Math.max(0, retryIndex)),
    DEFAULT_MAX_DELAY_MS,
  );

  return Math.random() * exponentialDelay;
}

export function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
