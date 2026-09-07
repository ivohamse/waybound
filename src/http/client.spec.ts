import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./client";
import type { HttpRequest } from "#types";

const request: HttpRequest = {
  url: "https://example.com/api",
  method: "GET",
  headers: {},
};

describe("HttpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a successful JSON response", async () => {
    const payload = { ok: true };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new HttpClient("TestProvider", { maxRetries: 0 });
    await expect(client.execute(request)).resolves.toEqual(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-transient HTTP errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Bad request", {
        status: 400,
        statusText: "Bad Request",
      }),
    );

    const client = new HttpClient("TestProvider", { maxRetries: 3 });

    await expect(client.execute(request)).rejects.toMatchObject({
      name: "WayboundError",
      code: "PROVIDER_ERROR",
      provider: "TestProvider",
      status: 400,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries a rate-limited request and respects Retry-After", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": "0" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    const client = new HttpClient("TestProvider", { maxRetries: 1 });

    await expect(client.execute(request)).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns RATE_LIMITED after the retry budget is exhausted", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { "Retry-After": "0" },
      }),
    );

    const client = new HttpClient("TestProvider", { maxRetries: 1 });

    await expect(client.execute(request)).rejects.toMatchObject({
      name: "WayboundError",
      code: "RATE_LIMITED",
      provider: "TestProvider",
      status: 429,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("maps network failures to NETWORK_ERROR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));

    const client = new HttpClient("TestProvider", { maxRetries: 0 });

    await expect(client.execute(request)).rejects.toMatchObject({
      name: "WayboundError",
      code: "NETWORK_ERROR",
      provider: "TestProvider",
    });
  });

  it("maps attempt timeouts to REQUEST_TIMEOUT", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("timed out");
          error.name = "TimeoutError";
          reject(error);
        });
      });
    });

    const client = new HttpClient("TestProvider", {
      timeoutMs: 1,
      maxRetries: 0,
    });

    await expect(client.execute(request)).rejects.toMatchObject({
      name: "WayboundError",
      code: "REQUEST_TIMEOUT",
      provider: "TestProvider",
    });
  });

  it("maps invalid JSON to INVALID_RESPONSE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = new HttpClient("TestProvider", { maxRetries: 0 });

    await expect(client.execute(request)).rejects.toMatchObject({
      name: "WayboundError",
      code: "INVALID_RESPONSE",
      provider: "TestProvider",
      status: 200,
    });
  });
});
