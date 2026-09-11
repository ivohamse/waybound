import { appendFileSync } from "node:fs";
import { WayboundError } from "../../../src/index";
import { parseRetryAfter } from "../../../src/http/retry";
import { caseId, type LiveCase } from "./matrix";

export interface HttpObservation {
  status: number | null;
  responseHeadersMs: number;
  retryAfterMs?: number;
  transportError?: "timeout" | "network";
}

export interface LiveRecord extends LiveCase {
  id: string;
  startedAt: string;
  status: "passed" | "failed" | "skipped" | "inconclusive";
  durationMs: number;
  http: HttpObservation[];
  wayboundErrorCode: string | null;
  failureKind: "rate-limit" | "timeout" | "network" | "provider" | "invalid-response" | "configuration" | "assertion" | "unavailable" | null;
}

export class MissingCredentialError extends Error {}
export class UnavailableCapabilityError extends Error {}

export function recordUnavailable(test: LiveCase): void {
  const record: LiveRecord = {
    ...test, id: caseId(test), startedAt: new Date().toISOString(), status: "skipped",
    durationMs: 0, http: [], wayboundErrorCode: null, failureKind: "unavailable",
  };
  if (process.env.WAYBOUND_LIVE_METADATA_FILE) appendFileSync(process.env.WAYBOUND_LIVE_METADATA_FILE, JSON.stringify(record) + "\n", "utf8");
}

// Scoped to the sequential live suite; never logs URLs, headers, keys or payloads.
export async function recordCase(test: LiveCase, execute: (record: LiveRecord) => Promise<void>, sink?: (record: LiveRecord) => void): Promise<void> {
  const originalFetch = globalThis.fetch;
  const started = performance.now();
  const record: LiveRecord = {
    ...test, id: caseId(test), startedAt: new Date().toISOString(),
    status: "failed", durationMs: 0, http: [], wayboundErrorCode: null, failureKind: null,
  };
  globalThis.fetch = async (...args) => {
    const start = performance.now();
    try {
      const response = await originalFetch(...args);
      const retryAfterMs = response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : undefined;
      record.http.push({ status: response.status, responseHeadersMs: performance.now() - start, ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
      return response;
    } catch (error) {
      const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
      record.http.push({ status: null, responseHeadersMs: performance.now() - start, transportError: timeout ? "timeout" : "network" });
      throw error;
    }
  };
  try {
    await execute();
    record.status = "passed";
  } catch (error) {
    if (error instanceof UnavailableCapabilityError) {
      record.status = "skipped";
      record.failureKind = "unavailable";
      return;
    }
    if (error instanceof WayboundError) {
      record.wayboundErrorCode = error.code;
      record.failureKind = error.code === "RATE_LIMITED" ? "rate-limit"
        : error.code === "REQUEST_TIMEOUT" ? "timeout"
        : error.code === "NETWORK_ERROR" ? "network"
        : error.code === "INVALID_RESPONSE" ? "invalid-response" : "provider";
      if (error.code === "RATE_LIMITED") {
        // A rate-limited live call cannot establish whether Waybound's public
        // contract works, but it is not evidence of a library regression.
        record.status = "inconclusive";
        return;
      }
    } else {
      record.failureKind = error instanceof MissingCredentialError ? "configuration" : "assertion";
    }
    throw error;
  } finally {
    globalThis.fetch = originalFetch;
    record.durationMs = performance.now() - started;
    if (sink) sink(record);
    else if (process.env.WAYBOUND_LIVE_METADATA_FILE) {
      appendFileSync(process.env.WAYBOUND_LIVE_METADATA_FILE, JSON.stringify(record) + "\n", "utf8");
    }
  }
}
