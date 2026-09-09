import { describe, expect, it } from "vitest";
import { Router, OpenRouteServiceProvider, GraphHopperProvider } from "../index";

const EXPECTED_PROFILES = ["car", "bike", "hike"];

describe("provider capabilities", () => {
  it("exposes OpenRouteService capabilities through the router", () => {
    const router = new Router({ provider: new OpenRouteServiceProvider("test-key") });

    expect(router.capabilities.directions.supported).toBe(true);
    expect(router.capabilities.nearest.supported).toBe(true);
    expect(router.capabilities.matrix.supported).toBe(true);
    expect(router.capabilities.isochrones.supported).toBe(true);

    expect(router.capabilities.directions.profiles).toEqual(EXPECTED_PROFILES);
    expect(router.capabilities.directions.options).toEqual([
      "language",
      "elevation",
      "instructions",
    ]);
    expect(router.capabilities.nearest.options).toEqual(["radius"]);
    expect(router.capabilities.nearest.semantics).toBe("native");
  });

  it("exposes GraphHopper option capabilities", () => {
    const router = new Router({
      provider: new GraphHopperProvider("test-key"),
    });

    expect(router.capabilities.directions.profiles).toEqual(EXPECTED_PROFILES);
    expect(router.capabilities.directions.options).toEqual([
      "language",
      "elevation",
      "instructions",
    ]);
    expect(router.capabilities.nearest.options).toEqual(["language"]);
    expect(router.capabilities.nearest.supported).toBe(true);
    expect(router.capabilities.nearest.semantics).toBe("approximation");
    expect(router.capabilities.nearest.notes).toContain("reverse geocoding");
    expect(router.capabilities.matrix.options).toEqual([]);
    expect(router.capabilities.matrix.semantics).toBe("native");
    expect(router.capabilities.isochrones.options).toEqual([
      "rangeType",
      "ranges",
    ]);
    expect(router.capabilities.isochrones.semantics).toBe("native");
  });

  it("rejects an option that the selected provider does not support", async () => {
    const ors = new Router({ provider: new OpenRouteServiceProvider("test-key") });
    const graphhopper = new Router({
      provider: new GraphHopperProvider("test-key"),
    });

    await expect(
      ors.getNearest({
        coordinates: [[5.121, 52.09]],
        profile: "hike",
        options: { language: "nl" },
      }),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_OPTION",
      provider: "OpenRouteService",
    });

    await expect(
      graphhopper.getNearest({
        coordinates: [[5.121, 52.09]],
        profile: "hike",
        options: { radius: 100 },
      }),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_OPTION",
      provider: "GraphHopper",
    });
  });
});
