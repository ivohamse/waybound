import { describe, expect, it, vi } from "vitest";
import {
  Router,
  WayboundError,
  type RoutingProvider,
  type RouteQuery,
  type IsochroneQuery,
  type FeatureCapability,
  type AuthenticationScheme,
} from "../index";

function makeProvider() {
  const capability: FeatureCapability = {
    supported: true,
    profiles: ["hike"],
    options: [],
    authentication: { required: false, schemes: [] },
  };
  return {
    name: "CustomProvider",
    authenticationSchemes: [] as AuthenticationScheme[],
    capabilities: {
      directions: { ...capability },
      nearest: { ...capability },
      matrix: { ...capability },
      isochrones: { ...capability, options: ["rangeType", "ranges"] },
    },
    getRoute: vi.fn<RoutingProvider["getRoute"]>().mockResolvedValue({
      provider: "CustomProvider", routes: [],
    }),
    getNearest: vi.fn<RoutingProvider["getNearest"]>().mockResolvedValue({
      provider: "CustomProvider", points: [],
    }),
    getMatrix: vi.fn<RoutingProvider["getMatrix"]>().mockResolvedValue({
      provider: "CustomProvider", distances: [], durations: [],
    }),
    getIsochrones: vi.fn<RoutingProvider["getIsochrones"]>().mockResolvedValue({
      provider: "CustomProvider", isochrones: [],
    }),
  } satisfies RoutingProvider;
}

const query: RouteQuery = {
  coordinates: [[5.12, 52.09], [5.11, 52.10]],
  profile: "hike",
};

describe("Router provider injection", () => {
  it("accepts an unregistered provider without credentials and preserves method context", async () => {
    const provider = makeProvider();
    provider.getRoute.mockImplementation(async function (this: RoutingProvider) {
      return { provider: this.name, routes: [] };
    });
    const router = new Router({ provider });

    expect(router.providerName).toBe(provider.name);
    expect(router.capabilities).toBe(provider.capabilities);
    await expect(router.getRoute(query)).resolves.toEqual({
      provider: "CustomProvider", routes: [],
    });
    expect(provider.getRoute).toHaveBeenCalledExactlyOnceWith(query);
  });

  it("delegates nearest, matrix and isochrones to the supplied instance", async () => {
    const provider = makeProvider();
    const router = new Router({ provider });
    const isochroneQuery: IsochroneQuery = {
      coordinate: [5.12, 52.09], profile: "hike",
      options: { rangeType: "time", ranges: [300] },
    };

    await expect(router.getNearest(query)).resolves.toEqual({ provider: provider.name, points: [] });
    await expect(router.getMatrix(query)).resolves.toEqual({ provider: provider.name, distances: [], durations: [] });
    await expect(router.getIsochrones(isochroneQuery)).resolves.toEqual({ provider: provider.name, isochrones: [] });
    expect(provider.getNearest).toHaveBeenCalledExactlyOnceWith(query);
    expect(provider.getMatrix).toHaveBeenCalledExactlyOnceWith(query);
    expect(provider.getIsochrones).toHaveBeenCalledExactlyOnceWith(isochroneQuery);
  });

  it("validates queries and custom capabilities before calling the provider", async () => {
    const provider = makeProvider();
    const router = new Router({ provider });
    await expect(router.getRoute({ ...query, coordinates: [] })).rejects.toMatchObject({ code: "INVALID_QUERY" });
    await expect(router.getRoute({ ...query, profile: "car" })).rejects.toMatchObject({ code: "UNSUPPORTED_PROFILE" });
    await expect(router.getRoute({ ...query, options: { language: "nl" } })).rejects.toMatchObject({ code: "UNSUPPORTED_OPTION" });
    provider.capabilities.directions.supported = false;
    await expect(router.getRoute(query)).rejects.toMatchObject({ code: "UNSUPPORTED_FEATURE" });
    expect(provider.getRoute).not.toHaveBeenCalled();
  });

  it("rejects missing or incompatible credentials before provider execution", async () => {
    const provider = makeProvider();
    provider.capabilities.directions.authentication = { required: true, schemes: ["api-key"] };
    const router = new Router({ provider });
    await expect(router.getRoute(query)).rejects.toMatchObject({ code: "MISSING_CREDENTIAL", provider: provider.name });
    expect(provider.getRoute).not.toHaveBeenCalled();

    provider.authenticationSchemes = ["bearer-token"];
    await expect(router.getRoute(query)).rejects.toMatchObject({ code: "UNSUPPORTED_AUTHENTICATION", provider: provider.name });
    expect(provider.getRoute).not.toHaveBeenCalled();

    provider.authenticationSchemes = ["api-key"];
    await expect(router.getRoute(query)).resolves.toEqual({ provider: provider.name, routes: [] });
  });

  it("normalizes custom provider errors and preserves existing Waybound errors", async () => {
    const provider = makeProvider();
    const router = new Router({ provider });
    const cause = new Error("upstream failure");
    provider.getRoute.mockRejectedValueOnce(cause);
    await expect(router.getRoute(query)).rejects.toMatchObject({
      code: "PROVIDER_ERROR", provider: provider.name, cause,
    });
    const error = new WayboundError("RATE_LIMITED", "Slow down", { status: 429 });
    provider.getRoute.mockRejectedValueOnce(error);
    await expect(router.getRoute(query)).rejects.toBe(error);
  });

  it("records normal calls without sending a second availability request", async () => {
    const provider = makeProvider();
    const router = new Router({ provider });

    await router.getRoute(query);

    expect(provider.getRoute).toHaveBeenCalledOnce();
    expect(router.getObservedAvailability("directions", "hike")).toMatchObject({
      availability: "available", reason: null,
    });
  });

  it("probes once and reuses the one-hour observation cache", async () => {
    const provider = makeProvider();
    const router = new Router({ provider });
    const options = {
      coordinates: [[5.12, 52.09], [5.11, 52.10]] as [[number, number], [number, number]],
      targets: [{ feature: "isochrones" as const, profile: "hike" as const }],
    };

    await router.probeCapabilities(options);
    await router.probeCapabilities(options);

    expect(provider.getIsochrones).toHaveBeenCalledOnce();
    expect(router.getObservedAvailability("isochrones", "hike")?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("records a recognized GraphHopper isochrone plan restriction as unavailable", async () => {
    const provider = makeProvider();
    provider.name = "GraphHopper";
    provider.getIsochrones.mockRejectedValueOnce(new WayboundError(
      "PROVIDER_ERROR", "Provider rejected request", { status: 400, providerMessage: "This feature requires a premium account." },
    ));
    const router = new Router({ provider });

    await expect(router.getIsochrones({ coordinate: [5.12, 52.09], profile: "hike", options: { rangeType: "time", ranges: [300] } })).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    expect(router.getObservedAvailability("isochrones", "hike")).toMatchObject({
      availability: "unavailable", reason: "plan-restricted", httpStatus: 400,
    });
  });
});
