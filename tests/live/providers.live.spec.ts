import { describe, expect, it } from "vitest";
import {
  Router, OpenRouteServiceProvider, GraphHopperProvider,
  type Coordinate, type RoutingProvider,
} from "../../src/index";
import { buildCases, caseId, liveSettings, type LiveCase } from "./support/matrix";
import { MissingCredentialError, recordCase, recordUnavailable, UnavailableCapabilityError } from "./support/record";

const settings = liveSettings(process.env);
const http = { timeoutMs: settings.timeoutMs, maxRetries: 0 };
const providers = [
  { key: "ors", credential: "ORS_API_KEY", create: (key: string) => new OpenRouteServiceProvider({ authentication: key ? { type: "api-key", value: key } : undefined, baseUrl: settings.orsBaseUrl, http }) },
  { key: "graphhopper", credential: "GRAPHHOPPER_API_KEY", create: (key: string) => new GraphHopperProvider({ authentication: key ? { type: "api-key", value: key } : undefined, baseUrl: settings.graphHopperBaseUrl, http }) },
].filter((p) => settings.providers.includes(p.key));

const CENTRE: Coordinate = [5.12142, 52.09063];
const STATION: Coordinate = [5.11142, 52.09];
const coordinates = [CENTRE, STATION];
let previousRequestFinished = false;

function expectCoordinate(value: number[]) {
  expect(value.length).toBeGreaterThanOrEqual(2);
  expect(value.every(Number.isFinite)).toBe(true);
  expect(Math.abs(value[0])).toBeLessThanOrEqual(180);
  expect(Math.abs(value[1])).toBeLessThanOrEqual(90);
}

async function exercise(test: LiveCase, router: Router) {
  const provider = { name: router.providerName, capabilities: router.capabilities } as RoutingProvider;
  const profile = test.profile;
  if (test.feature === "directions") {
    const response = await router.getRoute({ coordinates, profile, options: { instructions: true, language: "en" } });
    expect(response.provider).toBe(provider.name);
    expect(response.routes.length).toBeGreaterThan(0);
    for (const route of response.routes) {
      expect(route.distance).toBeGreaterThan(100);
      expect(route.distance).toBeLessThan(20_000);
      expect(route.duration).toBeGreaterThan(0);
      expect(route.duration).toBeLessThan(20_000);
      expect(route.geometry.type).toBe("LineString");
      expect(route.geometry.coordinates.length).toBeGreaterThan(1);
      route.geometry.coordinates.forEach(expectCoordinate);
      expect(route.maneuvers?.length ?? 0).toBeGreaterThan(0);
      expect(route).not.toHaveProperty("weight");
      expect(route).not.toHaveProperty("waypointOrder");
    }
  } else if (test.feature === "nearest") {
    // One input point keeps GraphHopper reverse geocoding to one HTTP request.
    const options = provider.capabilities.nearest.options.includes("radius") ? { radius: 500 } : undefined;
    const response = await router.getNearest({ coordinates: [CENTRE], profile, options });
    expect(response.provider).toBe(provider.name);
    expect(response.points).toHaveLength(1);
    const point = response.points[0];
    expect(point.sourceIndex).toBe(0);
    expect(point.inputCoordinate).toEqual(CENTRE);
    expect(point.nearestPoint?.type).toBe("Point");
    expectCoordinate(point.nearestPoint!.coordinates);
    expect(point).not.toHaveProperty("snappedPoint");
    if (provider.capabilities.nearest.semantics === "native") {
      expect(point.distance).not.toBeNull();
      expect(Number.isFinite(point.distance)).toBe(true);
      expect(point.distance).toBeGreaterThanOrEqual(0);
    } else expect(point.distance).toBeNull();
  } else if (test.feature === "matrix") {
    const response = await router.getMatrix({ coordinates, profile });
    expect(response.provider).toBe(provider.name);
    for (const matrix of [response.distances, response.durations]) {
      expect(matrix).toHaveLength(2);
      for (const row of matrix) {
        expect(row).toHaveLength(2);
        for (const value of row) {
          expect(value).not.toBeNull();
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
      expect(matrix[0][1]).toBeGreaterThan(0);
      expect(matrix[1][0]).toBeGreaterThan(0);
    }
  } else {
    const rangeType = test.rangeType!;
    const range = rangeType === "time" ? 300 : 1_000;
    const response = await router.getIsochrones({ coordinate: CENTRE, profile, options: { rangeType, ranges: [range] } });
    expect(response.provider).toBe(provider.name);
    expect(response.isochrones.length).toBeGreaterThan(0);
    for (const isochrone of response.isochrones) {
      expect(["Polygon", "MultiPolygon"]).toContain(isochrone.geometry.type);
      const polygons = isochrone.geometry.type === "Polygon" ? [isochrone.geometry.coordinates] : isochrone.geometry.coordinates;
      expect(polygons.length).toBeGreaterThan(0);
      for (const polygon of polygons) {
        expect(polygon.length).toBeGreaterThan(0);
        for (const ring of polygon) {
          expect(ring.length).toBeGreaterThanOrEqual(4);
          ring.forEach(expectCoordinate);
          expect(ring[0]).toEqual(ring[ring.length - 1]);
        }
      }
      if (rangeType === "time") {
        expect(isochrone).toHaveProperty("duration", range);
        expect(isochrone).not.toHaveProperty("distance");
      } else {
        expect(isochrone).toHaveProperty("distance", range);
        expect(isochrone).not.toHaveProperty("duration");
      }
    }
  }
}

describe("live provider capability matrix", () => {
  for (const definition of providers) {
    const apiKey = process.env[definition.credential];
    const provider = definition.create(apiKey ?? "");
    const router = new Router({ provider });
    for (const test of buildCases(provider)) {
      it(caseId(test), async () => {
        if (router.getObservedAvailability(test.feature, test.profile)?.availability === "unavailable") {
          recordUnavailable(test);
          return;
        }
        // Sleep before Router creates AbortSignal.timeout, so pacing cannot consume its timeout.
        if (apiKey && previousRequestFinished) await new Promise((resolve) => setTimeout(resolve, settings.delayMs));
        await recordCase(test, async () => {
          if (!apiKey) throw new MissingCredentialError(`Missing ${definition.credential}. Configure it in .env or select another provider with WAYBOUND_LIVE_PROVIDERS.`);
          try {
            await exercise(test, router);
          } catch (error) {
            if (router.getObservedAvailability(test.feature, test.profile)?.availability === "unavailable") {
              throw new UnavailableCapabilityError("Capability unavailable for this provider/account.");
            }
            throw error;
          }
          finally { previousRequestFinished = true; }
        });
      }, settings.timeoutMs + settings.delayMs + 10_000);
    }
  }
});
