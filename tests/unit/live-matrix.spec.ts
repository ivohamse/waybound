import { describe, expect, it, vi, afterEach } from "vitest";
import { GraphHopperProvider, OpenRouteServiceProvider } from "../../src/index";
import { buildCases, caseId, liveSettings, type LiveCase } from "../live/support/matrix";
import { MissingCredentialError, recordCase, type LiveRecord } from "../live/support/record";

const testCase: LiveCase = { provider: "GraphHopper", feature: "matrix", profile: "hike" };
afterEach(() => vi.unstubAllGlobals());

describe("live capability matrix", () => {
  it("covers every advertised feature/profile and both isochrone range types", () => {
    const providers = [new OpenRouteServiceProvider("unused"), new GraphHopperProvider("unused")];
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
    const provider = new OpenRouteServiceProvider("unused");
    const custom = {
      ...provider,
      capabilities: {
        ...provider.capabilities,
        matrix: { supported: false, profiles: [], options: [] },
        nearest: { supported: true, profiles: ["hike" as const], options: [] },
      },
    };
    // Preserve prototype methods while supplying distinct capability metadata.
    const cases = buildCases(Object.assign(Object.create(provider), custom));
    expect(cases.some((test) => test.feature === "matrix")).toBe(false);
    expect(cases.filter((test) => test.feature === "nearest").map((test) => test.profile)).toEqual(["hike"]);
  });

  it("validates provider selection and pacing settings", () => {
    expect(liveSettings({})).toEqual({ providers: ["ors", "graphhopper"], delayMs: 1500, timeoutMs: 10000 });
    expect(liveSettings({ WAYBOUND_LIVE_PROVIDERS: "ors", WAYBOUND_LIVE_DELAY_MS: "0" }).providers).toEqual(["ors"]);
    expect(() => liveSettings({ WAYBOUND_LIVE_PROVIDERS: "typo" })).toThrow();
    expect(() => liveSettings({ WAYBOUND_LIVE_DELAY_MS: "-1" })).toThrow();
    expect(() => liveSettings({ WAYBOUND_LIVE_TIMEOUT_MS: "NaN" })).toThrow();
  });
});

describe("live execution diagnostics", () => {
  it("retains a real 429 as failure, records it and restores fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const records: LiveRecord[] = [];
    const provider = new GraphHopperProvider("not-a-real-key", { maxRetries: 0 });
    await expect(recordCase(testCase, async () => {
      await provider.getMatrix({ coordinates: [[5.12, 52.09], [5.11, 52.10]], profile: "hike" });
    }, (record) => records.push(record))).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(globalThis.fetch).toBe(fetchMock);
    expect(records[0]).toMatchObject({ status: "failed", failureKind: "rate-limit", wayboundErrorCode: "RATE_LIMITED", http: [{ status: 429 }] });
    expect(JSON.stringify(records)).not.toContain("not-a-real-key");
    expect(JSON.stringify(records)).not.toContain("https:");
  });

  it("records network timeout without an invented HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    const sink = vi.fn();
    const provider = new OpenRouteServiceProvider("unused", { maxRetries: 0 });
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
