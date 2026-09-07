import { describe, expect, it } from "vitest";
import { Router } from "./router";

const EXPECTED_PROFILES = ["car", "bike", "hike"];

describe("provider capabilities", () => {
  it("exposes OpenRouteService capabilities through the router", () => {
    const router = new Router({ provider: "ors", apiKey: "test-key" });

    expect(router.capabilities.directions.supported).toBe(true);
    expect(router.capabilities.nearest.supported).toBe(true);
    expect(router.capabilities.matrix.supported).toBe(true);
    expect(router.capabilities.isochrones.supported).toBe(true);

    expect(router.capabilities.directions.profiles).toEqual(EXPECTED_PROFILES);
    expect(router.capabilities.nearest.semantics).toBe("native");
  });

  it("marks GraphHopper nearest as an approximation", () => {
    const router = new Router({
      provider: "graphhopper",
      apiKey: "test-key",
    });

    expect(router.capabilities.directions.profiles).toEqual(EXPECTED_PROFILES);
    expect(router.capabilities.nearest.supported).toBe(true);
    expect(router.capabilities.nearest.semantics).toBe("approximation");
    expect(router.capabilities.nearest.notes).toContain("reverse geocoding");
    expect(router.capabilities.matrix.semantics).toBe("native");
    expect(router.capabilities.isochrones.semantics).toBe("native");
  });
});
