import type { ProfileType, ProviderCapabilities, RoutingProvider, FeatureCapability } from "../../../src/index";

export interface LiveCase {
  provider: string;
  feature: keyof ProviderCapabilities;
  profile: ProfileType;
  rangeType?: "time" | "distance";
}

export function caseId(test: LiveCase): string {
  return [test.provider, test.feature, test.profile, test.rangeType].filter(Boolean).join(" / ");
}

export function buildCases(provider: RoutingProvider): LiveCase[] {
  return (Object.entries(provider.capabilities) as [keyof ProviderCapabilities, FeatureCapability][]).flatMap(([feature, capability]) => {
    if (!capability.supported) return [];
    return capability.profiles.flatMap((profile): LiveCase[] => {
      const base = { provider: provider.name, feature: feature as LiveCase["feature"], profile };
      return feature === "isochrones"
        ? [{ ...base, rangeType: "time" }, { ...base, rangeType: "distance" }]
        : [base];
    });
  });
}

export function liveSettings(env: Record<string, string | undefined>) {
  const providers = (env.WAYBOUND_LIVE_PROVIDERS ?? "ors,graphhopper").split(",").map((s) => s.trim());
  if (!providers.length || providers.some((p) => !["ors", "graphhopper"].includes(p))) {
    throw new Error("WAYBOUND_LIVE_PROVIDERS must contain ors and/or graphhopper, separated by commas.");
  }
  const readMs = (key: string, fallback: number, minimum: number) => {
    const value = env[key] === undefined ? fallback : Number(env[key]);
    if (!Number.isInteger(value) || value < minimum || value > 60_000) {
      throw new Error(`${key} must be an integer between ${minimum} and 60000.`);
    }
    return value;
  };
  return {
    providers: [...new Set(providers)],
    delayMs: readMs("WAYBOUND_LIVE_DELAY_MS", 1_500, 0),
    timeoutMs: readMs("WAYBOUND_LIVE_TIMEOUT_MS", 10_000, 1),
  };
}
