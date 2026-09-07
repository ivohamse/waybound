import { describe, expect, it, vi } from "vitest";
import {
  getRetryDelay,
  isRetryableStatus,
  parseRetryAfter,
} from "./retry";

describe("HTTP retry helpers", () => {
  it("retries only transient statuses", () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(502)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(504)).toBe(true);

    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(500)).toBe(false);
  });

  it("parses Retry-After expressed in seconds", () => {
    expect(parseRetryAfter("2")).toBe(2000);
    expect(parseRetryAfter("0")).toBe(0);
  });

  it("parses Retry-After expressed as an HTTP date", () => {
    const now = Date.parse("2026-09-07T20:00:00Z");
    expect(
      parseRetryAfter("Mon, 07 Sep 2026 20:00:05 GMT", now),
    ).toBe(5000);
  });

  it("uses Retry-After directly when supplied", () => {
    expect(getRetryDelay(2, 2500)).toBe(2500);
  });

  it("uses jittered exponential backoff as fallback", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(getRetryDelay(0)).toBe(250);
    expect(getRetryDelay(1)).toBe(500);
    expect(getRetryDelay(2)).toBe(1000);

    vi.restoreAllMocks();
  });
});
