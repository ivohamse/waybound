import { describe, expect, it } from "vitest";
import { Router } from "../../src/index";

const apiKey = process.env.ORS_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing ORS_API_KEY. Add it to your local .env file before running npm run test:live.",
  );
}

const router = new Router({ provider: "ors", apiKey });

const UTRECHT_CENTRE: [number, number] = [5.12142, 52.09063];
const UTRECHT_STATION: [number, number] = [5.11142, 52.09];
const UTRECHT_MUSEUM: [number, number] = [5.128, 52.085];

describe("OpenRouteService live integration", () => {
  it("calculates a real route", async () => {
    const response = await router.getRoute({
      coordinates: [UTRECHT_CENTRE, UTRECHT_STATION],
      profile: "hike",
      options: { instructions: true, language: "en" },
    });

    expect(response.provider).toBe("OpenRouteService");
    expect(response.routes.length).toBeGreaterThan(0);

    const route = response.routes[0];
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.durationSeconds).toBeGreaterThan(0);
    expect(route.geometry.type).toBe("LineString");
    expect(route.geometry.coordinates.length).toBeGreaterThan(1);
    expect(route.maneuvers?.length ?? 0).toBeGreaterThan(0);
  });

  it("snaps a coordinate to the routing network", async () => {
    const response = await router.getNearest({
      coordinate: UTRECHT_CENTRE,
      profile: "hike",
      options: { radius: 500 },
    });

    expect(response.provider).toBe("OpenRouteService");
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

    expect(response.provider).toBe("OpenRouteService");
    expect(response.durations).toHaveLength(3);
    expect(response.distances).toHaveLength(3);
    expect(response.durations.every((row) => row.length === 3)).toBe(true);
    expect(response.distances.every((row) => row.length === 3)).toBe(true);
    expect(response.durations[0][1]).toBeGreaterThan(0);
    expect(response.distances[0][1]).toBeGreaterThan(0);
  });

  it("generates real isochrones", async () => {
    const response = await router.getIsochrones({
      coordinate: UTRECHT_CENTRE,
      profile: "bike",
      options: {
        rangeType: "time",
        ranges: [300, 600],
      },
    });

    expect(response.provider).toBe("OpenRouteService");
    expect(response.isochrones.length).toBeGreaterThan(0);

    for (const isochrone of response.isochrones) {
      expect(["Polygon", "MultiPolygon"]).toContain(isochrone.geometry.type);
      expect(isochrone.value).toBeGreaterThan(0);
    }
  });
});
