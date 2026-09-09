import { describe, expect, it } from "vitest";
import { Router, OpenRouteServiceProvider } from "../../src/index";

const apiKey = process.env.ORS_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing ORS_API_KEY. Add it to your local .env file before running npm run test:live.",
  );
}

const router = new Router({
  provider: new OpenRouteServiceProvider(apiKey, {
    timeoutMs: 5_000,
    maxRetries: 1,
  }),
});
const diagnosticRouter = new Router({
  provider: new OpenRouteServiceProvider(apiKey, {
    timeoutMs: 2_000,
    maxRetries: 1,
  }),
});

const UTRECHT_CENTRE: [number, number] = [5.12142, 52.09063];
const UTRECHT_STATION: [number, number] = [5.11142, 52.09];
const UTRECHT_MUSEUM: [number, number] = [5.128, 52.085];

function expectDiagnosticFailure(error: unknown): void {
  expect(error).toMatchObject({
    name: "WayboundError",
    provider: "OpenRouteService",
  });

  expect(["REQUEST_TIMEOUT", "PROVIDER_ERROR"]).toContain(
    (error as { code?: string }).code,
  );
}

describe("OpenRouteService live integration", () => {
  it("calculates a real route with the public route contract", async () => {
    const response = await router.getRoute({
      coordinates: [UTRECHT_CENTRE, UTRECHT_STATION],
      profile: "hike",
      options: { instructions: true, language: "en" },
    });

    expect(response.provider).toBe("OpenRouteService");
    expect(response.routes.length).toBeGreaterThan(0);

    const route = response.routes[0];
    expect(route.distance).toBeGreaterThan(100);
    expect(route.distance).toBeLessThan(10_000);
    expect(route.duration).toBeGreaterThan(30);
    expect(route.duration).toBeLessThan(10_000);
    expect(route.geometry.type).toBe("LineString");
    expect(route.geometry.coordinates.length).toBeGreaterThan(1);
    expect(route.maneuvers?.length ?? 0).toBeGreaterThan(0);
    expect(route).not.toHaveProperty("weight");
    expect(route).not.toHaveProperty("waypointOrder");
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
      expect(point.nearestPoint).not.toBeNull();
      expect(point.nearestPoint?.type).toBe("Point");
      expect(point.nearestPoint?.coordinates).toHaveLength(2);
      expect(point.distance).not.toBeNull();
      expect(point.distance).toBeGreaterThanOrEqual(0);
      expect(point).not.toHaveProperty("snappedPoint");
    }
  });

  it("calculates a real distance/time matrix or reports a diagnostic provider failure", async () => {
    let response;

    try {
      response = await diagnosticRouter.getMatrix({
        coordinates: [UTRECHT_CENTRE, UTRECHT_STATION, UTRECHT_MUSEUM],
        profile: "bike",
      });
    } catch (error) {
      expectDiagnosticFailure(error);
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

  it("generates time-based isochrones with duration values or reports a diagnostic provider failure", async () => {
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
      expectDiagnosticFailure(error);
      return;
    }

    expect(response.provider).toBe("OpenRouteService");
    expect(response.isochrones.length).toBeGreaterThan(0);

    for (const isochrone of response.isochrones) {
      expect(["Polygon", "MultiPolygon"]).toContain(isochrone.geometry.type);
      expect("duration" in isochrone).toBe(true);
      expect("distance" in isochrone).toBe(false);
      if ("duration" in isochrone) {
        expect(isochrone.duration).toBeGreaterThan(0);
      }
    }
  });

  it("generates distance-based isochrones with distance values or reports a diagnostic provider failure", async () => {
    let response;

    try {
      response = await diagnosticRouter.getIsochrones({
        coordinate: UTRECHT_CENTRE,
        profile: "bike",
        options: {
          rangeType: "distance",
          ranges: [1_000, 2_000],
        },
      });
    } catch (error) {
      expectDiagnosticFailure(error);
      return;
    }

    expect(response.provider).toBe("OpenRouteService");
    expect(response.isochrones.length).toBeGreaterThan(0);

    for (const isochrone of response.isochrones) {
      expect(["Polygon", "MultiPolygon"]).toContain(isochrone.geometry.type);
      expect("distance" in isochrone).toBe(true);
      expect("duration" in isochrone).toBe(false);
      if ("distance" in isochrone) {
        expect(isochrone.distance).toBeGreaterThan(0);
      }
    }
  });
});
