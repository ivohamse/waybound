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

  it("returns one approximate nearest result per input coordinate", async () => {
    const coordinates = [UTRECHT_CENTRE, UTRECHT_STATION];
    const response = await router.getNearest({
      coordinates,
      profile: "bike",
    });

    expect(response.provider).toBe("GraphHopper");
    expect(response.points).toHaveLength(coordinates.length);

    for (const point of response.points) {
      expect(point.inputCoordinate).toEqual(coordinates[point.sourceIndex]);
      expect(point.snappedPoint).not.toBeNull();
      expect(point.snappedPoint?.type).toBe("Point");
      expect(point.snappedPoint?.coordinates).toHaveLength(2);
      expect(point.distanceMeters).toBeNull();
    }
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
    expect(response.durations[0][1]).not.toBeNull();
    expect(response.distances[0][1]).not.toBeNull();
  });

  it("generates real isochrones or reports the account limitation", async () => {
    let response;

    try {
      response = await router.getIsochrones({
        coordinate: UTRECHT_CENTRE,
        profile: "bike",
        options: {
          rangeType: "time",
          ranges: [600],
        },
      });
    } catch (error) {
      expect(error).toMatchObject({
        name: "WayboundError",
        code: "PROVIDER_ERROR",
        provider: "GraphHopper",
        status: 400,
      });
      return;
    }

    expect(response.provider).toBe("GraphHopper");
    expect(response.isochrones).toHaveLength(1);
    expect(response.isochrones[0].value).toBe(600);
    expect(["Polygon", "MultiPolygon"]).toContain(
      response.isochrones[0].geometry.type,
    );
  });
});
