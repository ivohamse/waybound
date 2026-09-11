import { WayboundError } from "../../../src/index";

export interface RateLimitRetryOptions {
  getRetryAfterMs: () => number | undefined;
  maxRetryAfterMs: number;
  sleep?: (delayMs: number) => Promise<void>;
}

const sleep = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

/**
 * Retries one rate-limited live operation only when the provider supplied a
 * bounded Retry-After value. Refusing an impractically long retry is safer
 * than letting a Vitest timeout leave shared fetch instrumentation installed.
 */
export async function retryRateLimitedOnce<T>(
  execute: () => Promise<T>,
  options: RateLimitRetryOptions,
): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    if (!(error instanceof WayboundError) || error.code !== "RATE_LIMITED") throw error;

    const retryAfterMs = options.getRetryAfterMs();
    if (retryAfterMs === undefined || retryAfterMs > options.maxRetryAfterMs) throw error;

    if (retryAfterMs > 0) await (options.sleep ?? sleep)(retryAfterMs);
    return execute();
  }
}
