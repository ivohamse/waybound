import { describe, expect, it } from "vitest";
import { Router } from "../../src/index";

const apiKey = process.env.GRAPHHOPPER_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing GRAPHHOPPER_API_KEY. Add it to your local .env file before running npm run test:live.",
  );
}

const router = new Router({ provider: "graphhopper", apiKey });

const UTRECHT_CENTRE: [number, number] = [5.12142, 52.09063];
const UTRECHT_STATION: [number, number] = [5.11142, 52.09];
const UTRECHT_MUSEUM: [number, number] = [5.128, 52.085];

describe("GraphHopper live integration", () => {
  it("calculates a real route", async () => {
    const response = await router.getRoute({
      coordinates: [UTRECHT_CENTRE, UTRECHT_STATION],
      profile: "bike",
      options: { instructions: true, language: "en" },
    });

    expect(response.provider).toBe("GraphHopper");
    expect(response.routes.length).toBeGreaterThan(0);

    const route = response.routes[0];
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.geometry.type).toBe("LineString");
    expect(route.geometry.coordinates.length).toBeGreaterThan(1);
    expect(route.maneuvers?.length ?? 0).toBeGreaterThan(0);
  });

  it("returns a nearby point for getNearest", async () => {
    const response = await router.getNearest({
      coordinate: UTRECHT_CENTRE,
      profile: "bike",
    });

    expect(response.provider).toBe("GraphHopper");
    expect(response.snappedCoordinate).toHaveLength(2);
    expect(Number.isFinite(response.snappedCoordinate[0])).toBe(true);
    expect(Number.isFinite(response.snappedCoordinate[1])).toBe(true);
    expect(response.distanceMeters).toBeGreaterThanOrEqual(0);
  });

  it("calculates a real distance/time matrix", async () => {
    const response = await router.getMatrix({
      coordinates: [UTRECHT_CENTRE, UTRECHT_STATION, UTRECHT_MUSEUM],
      profile: "bike",
    });

    expect(response.provider).toBe("GraphHopper");
    expect(response.durations).toHaveLength(3);
    expect(response.distances).toHaveLength(3);
    expect(response.durations.every((row) => row.length === 3)).toBe(true);
    expect(response.distances.every((row) => row.length === 3)).toBe(true);
    expect(response.durations[0][1]).toBeGreaterThan(0);
    expect(response.distances[0][1]).toBeGreaterThan(0);
  });

  // The current GraphHopper API subscription has no Isochrone API allowance
  // (the API reports an allowed time_limit of 0). Keep the contract test here so
  // it can be enabled as soon as the account supports this endpoint.
  it.skip("generates real isochrones", async () => {
    const response = await router.getIsochrones({
      coordinate: UTRECHT_CENTRE,
      profile: "bike",
      options: {
        rangeType: "time",
        ranges: [600],
      },
    });

    expect(response.provider).toBe("GraphHopper");
    expect(response.isochrones.length).toBeGreaterThan(0);

    for (const isochrone of response.isochrones) {
      expect(["Polygon", "MultiPolygon"]).toContain(isochrone.geometry.type);
    }
  });
});
