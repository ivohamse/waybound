import { describe, expect, it } from "vitest";
import { Router } from "../../src/index";

const apiKey = process.env.ORS_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing ORS_API_KEY. Add it to your local .env file before running npm run test:live.",
  );
}

const router = new Router({ provider: "ors", apiKey });
const diagnosticRouter = new Router({
  provider: "ors",
  apiKey,
  http: {
    timeoutMs: 2_000,
    maxRetries: 1,
  },
});

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

  it("snaps multiple coordinates to the routing network in one request", async () => {
    const coordinates = [UTRECHT_CENTRE, UTRECHT_STATION];
    const response = await router.getNearest({
      coordinates,
      profile: "hike",
      options: { radius: 500 },
    });

    expect(response.provider).toBe("OpenRouteService");
    expect(response.points).toHaveLength(coordinates.length);

    for (const [index, point] of response.points.entries()) {
      expect(point.sourceIndex).toBe(index);
      expect(point.inputCoordinate).toEqual(coordinates[index]);
      expect(point.snappedCoordinate).not.toBeNull();
      expect(point.snappedCoordinate).toHaveLength(2);
      expect(point.distanceMeters).not.toBeNull();
      expect(point.distanceMeters).toBeGreaterThanOrEqual(0);
    }
  });

  it("calculates a real distance/time matrix or reports a typed timeout", async () => {
    let response;

    try {
      response = await diagnosticRouter.getMatrix({
        coordinates: [UTRECHT_CENTRE, UTRECHT_STATION, UTRECHT_MUSEUM],
        profile: "bike",
      });
    } catch (error) {
      expect(error).toMatchObject({
        name: "WayboundError",
        code: "REQUEST_TIMEOUT",
        provider: "OpenRouteService",
      });
      return;
    }

    expect(response.provider).toBe("OpenRouteService");
    expect(response.durations).toHaveLength(3);
    expect(response.distances).toHaveLength(3);
    expect(response.durations.every((row) => row.length === 3)).toBe(true);
    expect(response.distances.every((row) => row.length === 3)).toBe(true);
    expect(response.durations[0][1]).not.toBeNull();
    expect(response.distances[0][1]).not.toBeNull();
  });

  it("generates real isochrones or reports a typed timeout", async () => {
    let response;

    try {
      response = await diagnosticRouter.getIsochrones({
        coordinate: UTRECHT_CENTRE,
        profile: "bike",
        options: {
          rangeType: "time",
          ranges: [300, 600],
        },
      });
    } catch (error) {
      expect(error).toMatchObject({
        name: "WayboundError",
        code: "REQUEST_TIMEOUT",
        provider: "OpenRouteService",
      });
      return;
    }

    expect(response.provider).toBe("OpenRouteService");
    expect(response.isochrones.length).toBeGreaterThan(0);

    for (const isochrone of response.isochrones) {
      expect(["Polygon", "MultiPolygon"]).toContain(isochrone.geometry.type);
      expect(isochrone.value).toBeGreaterThan(0);
    }
  });
});
