import type { HttpRequest } from "#types";
import { WayboundError } from "../errors";
import {
  getRetryDelay,
  isRetryableStatus,
  parseRetryAfter,
  sleep,
} from "./retry";

export interface HttpClientOptions {
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;

export class HttpClient {
  private readonly providerName: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(providerName: string, options: HttpClientOptions = {}) {
    this.providerName = providerName;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  public async execute<T = any>(request: HttpRequest): Promise<T> {
    let retryIndex = 0;

    while (true) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.ok) {
          return await this.parseJson<T>(response);
        }

        if (
          isRetryableStatus(response.status) &&
          retryIndex < this.maxRetries
        ) {
          const retryAfterMs = parseRetryAfter(
            response.headers.get("Retry-After"),
          );
          const delayMs = getRetryDelay(retryIndex, retryAfterMs);
          retryIndex++;
          await sleep(delayMs);
          continue;
        }

        throw this.createHttpError(response);
      } catch (error: unknown) {
        if (error instanceof WayboundError) {
          throw error;
        }

        const isTimeout = this.isTimeoutError(error);

        if (retryIndex < this.maxRetries) {
          const delayMs = getRetryDelay(retryIndex);
          retryIndex++;
          await sleep(delayMs);
          continue;
        }

        if (isTimeout) {
          throw new WayboundError(
            "REQUEST_TIMEOUT",
            `[waybound -> ${this.providerName}] Request timed out after ${this.timeoutMs}ms.`,
            {
              provider: this.providerName,
              cause: error,
            },
          );
        }

        throw new WayboundError(
          "NETWORK_ERROR",
          `[waybound -> ${this.providerName}] Network request failed.`,
          {
            provider: this.providerName,
            cause: error,
          },
        );
      }
    }
  }

  private async parseJson<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (error: unknown) {
      throw new WayboundError(
        "INVALID_RESPONSE",
        `[waybound -> ${this.providerName}] Provider returned an invalid JSON response.`,
        {
          provider: this.providerName,
          status: response.status,
          cause: error,
        },
      );
    }
  }

  private createHttpError(response: Response): WayboundError {
    if (response.status === 429) {
      return new WayboundError(
        "RATE_LIMITED",
        `[waybound -> ${this.providerName}] Provider rate limit exceeded.`,
        {
          provider: this.providerName,
          status: response.status,
        },
      );
    }

    return new WayboundError(
      "PROVIDER_ERROR",
      `[waybound -> ${this.providerName}] Provider request failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`,
      {
        provider: this.providerName,
        status: response.status,
      },
    );
  }

  private isTimeoutError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    );
  }
}
