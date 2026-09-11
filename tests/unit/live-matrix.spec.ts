import { describe, expect, it, vi, afterEach } from "vitest";
import { GraphHopperProvider, OpenRouteServiceProvider, WayboundError } from "../../src/index";
import { buildCases, caseId, liveSettings, type LiveCase } from "../live/support/matrix";
import { ProviderPacer } from "../live/support/pacing";
import { retryRateLimitedOnce } from "../live/support/retry";
import { MissingCredentialError, recordCase, type LiveRecord } from "../live/support/record";

const testCase: LiveCase = { provider: "GraphHopper", feature: "matrix", profile: "hike" };
afterEach(() => vi.unstubAllGlobals());

describe("live capability matrix", () => {
  it("covers every advertised feature/profile and both isochrone range types", () => {
    const providers = [new OpenRouteServiceProvider({ authentication: { type: "api-key", value: "unused" } }), new GraphHopperProvider({ authentication: { type: "api-key", value: "unused" } })];
    const cases = providers.flatMap(buildCases);
    expect(cases).toHaveLength(30);
    expect(new Set(cases.map(caseId)).size).toBe(30);
    for (const provider of providers) {
      for (const [feature, capability] of Object.entries(provider.capabilities)) {
        for (const profile of capability.profiles) {
          const matches = cases.filter((test) => test.provider === provider.name && test.feature === feature && test.profile === profile);
          expect(matches).toHaveLength(feature === "isochrones" ? 2 : 1);
          if (feature === "isochrones") expect(matches.map((test) => test.rangeType)).toEqual(["time", "distance"]);
        }
      }
    }
  });

  it("uses capabilities rather than a fixed profile list", () => {
    const provider = new OpenRouteServiceProvider({ authentication: { type: "api-key", value: "unused" } });
    const custom = {
      ...provider,
      capabilities: {
        ...provider.capabilities,
        matrix: { supported: false, profiles: [], options: [], authentication: { required: false, schemes: [] } },
        nearest: { supported: true, profiles: ["hike" as const], options: [], authentication: { required: false, schemes: [] } },
      },
    };
    // Preserve prototype methods while supplying distinct capability metadata.
    const cases = buildCases(Object.assign(Object.create(provider), custom));
    expect(cases.some((test) => test.feature === "matrix")).toBe(false);
    expect(cases.filter((test) => test.feature === "nearest").map((test) => test.profile)).toEqual(["hike"]);
  });

  it("validates provider selection and provider-specific pacing settings", () => {
    expect(liveSettings({})).toEqual({ providers: ["ors", "graphhopper"], delayMs: 0, orsDelayMs: 0, graphHopperDelayMs: 1500, maxRetryAfterMs: 10000, timeoutMs: 10000, orsBaseUrl: undefined, graphHopperBaseUrl: undefined });
    expect(liveSettings({ WAYBOUND_LIVE_PROVIDERS: "ors", WAYBOUND_LIVE_DELAY_MS: "750", WAYBOUND_LIVE_ORS_DELAY_MS: "100" })).toMatchObject({ providers: ["ors"], delayMs: 750, orsDelayMs: 100, graphHopperDelayMs: 750 });
    expect(liveSettings({ WAYBOUND_LIVE_DELAY_MS: "0" })).toMatchObject({ orsDelayMs: 0, graphHopperDelayMs: 0 });
    expect(() => liveSettings({ WAYBOUND_LIVE_PROVIDERS: "typo" })).toThrow();
    expect(() => liveSettings({ WAYBOUND_LIVE_DELAY_MS: "-1" })).toThrow();
    expect(() => liveSettings({ WAYBOUND_LIVE_TIMEOUT_MS: "NaN" })).toThrow();
  });

  it("retries a bounded rate limit once", async () => {
    const error = new WayboundError("RATE_LIMITED", "Slow down");
    const execute = vi.fn<() => Promise<string>>().mockRejectedValueOnce(error).mockResolvedValueOnce("ok");
    const sleep = vi.fn<() => Promise<void>>().mockResolvedValue();
    await expect(retryRateLimitedOnce(execute, { getRetryAfterMs: () => 500, maxRetryAfterMs: 1_000, sleep })).resolves.toBe("ok");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("does not retry an unbounded rate limit", async () => {
    const error = new WayboundError("RATE_LIMITED", "Slow down");
    const execute = vi.fn<() => Promise<void>>().mockRejectedValue(error);
    await expect(retryRateLimitedOnce(execute, { getRetryAfterMs: () => 10_001, maxRetryAfterMs: 10_000 })).rejects.toBe(error);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("paces each provider independently", async () => {
    vi.useFakeTimers();
    try {
      const pacer = new ProviderPacer();
      pacer.complete("GraphHopper");
      const delayed = pacer.wait("GraphHopper", 1_500);
      const immediate = pacer.wait("OpenRouteService", 1_500);
      await immediate;
      await vi.advanceTimersByTimeAsync(1_500);
      await delayed;
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads optional custom provider endpoints", () => {
    expect(liveSettings({
      ORS_BASE_URL: " http://localhost:8080/openrouteservice/ ",
      GRAPHHOPPER_BASE_URL: "http://localhost:8989/api/1",
    })).toMatchObject({
      orsBaseUrl: "http://localhost:8080/openrouteservice/",
      graphHopperBaseUrl: "http://localhost:8989/api/1",
    });
  });
});

describe("live execution diagnostics", () => {
  it("records a real 429 as inconclusive and restores fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const records: LiveRecord[] = [];
    const provider = new GraphHopperProvider({ authentication: { type: "api-key", value: "not-a-real-key" }, http: { maxRetries: 0 } });
    await recordCase(testCase, async () => {
      await provider.getMatrix({ coordinates: [[5.12, 52.09], [5.11, 52.10]], profile: "hike" });
    }, (record) => records.push(record));
    expect(globalThis.fetch).toBe(fetchMock);
    expect(records[0]).toMatchObject({ status: "inconclusive", failureKind: "rate-limit", wayboundErrorCode: "RATE_LIMITED", http: [{ status: 429 }] });
    expect(JSON.stringify(records)).not.toContain("not-a-real-key");
    expect(JSON.stringify(records)).not.toContain("https:");
  });

  it("records network timeout without an invented HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    const sink = vi.fn();
    const provider = new OpenRouteServiceProvider({ authentication: { type: "api-key", value: "unused" }, http: { maxRetries: 0 } });
    await expect(recordCase({ ...testCase, provider: provider.name }, async () => {
      await provider.getMatrix({ coordinates: [[5.12, 52.09], [5.11, 52.10]], profile: "hike" });
    }, sink)).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", failureKind: "timeout", http: [expect.objectContaining({ status: null, transportError: "timeout" })] }));
  });

  it("keeps an assertion failure red even after HTTP 200", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("{}")));
    const sink = vi.fn();
    const failure = new Error("Wrong geometry");
    await expect(recordCase(testCase, async () => {
      await fetch("https://example.test");
      throw failure;
    }, sink)).rejects.toBe(failure);
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", failureKind: "assertion", http: [expect.objectContaining({ status: 200 })] }));
  });

  it("records missing credentials as configuration failure without a request", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const sink = vi.fn();
    await expect(recordCase(testCase, async () => { throw new MissingCredentialError("Missing key"); }, sink)).rejects.toThrow("Missing key");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ failureKind: "configuration", http: [], status: "failed" }));
  });

  it("records success only after the assertions finish", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("{}")));
    const sink = vi.fn();
    await recordCase(testCase, async () => { await fetch("https://example.test"); }, sink);
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ status: "passed", failureKind: null, wayboundErrorCode: null, durationMs: expect.any(Number) }));
  });
});
