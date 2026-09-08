import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouteServiceProvider } from "./index";
import { HttpClient } from "../../http/client";
import type { RouteQuery } from "#types";

describe("OpenRouteServiceProvider", () => {
  let provider: OpenRouteServiceProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new OpenRouteServiceProvider("test-api-key");
  });

  it("transforms an ORS directions response", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      features: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [5.12, 52.09],
              [5.11, 52.09],
            ],
          },
          properties: {
            summary: { distance: 1250.5, duration: 180, weight: 42 },
          },
        },
      ],
    });

    const query: RouteQuery = {
      coordinates: [
        [5.12, 52.09],
        [5.11, 52.09],
      ],
      profile: "bike",
    };

    const response = await provider.getRoute(query);
    const route = response.routes[0];

    expect(response.provider).toBe("OpenRouteService");
    expect(route.distanceMeters).toBe(1250.5);
    expect(route.durationSeconds).toBe(180);
    expect(route.weight).toBe(42);
    expect(route.geometry.type).toBe("LineString");
  });

  it("uses way_points to locate ORS maneuvers", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      features: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [5.12, 52.09],
              [5.11, 52.09],
            ],
          },
          properties: {
            summary: { distance: 1000, duration: 60 },
            segments: [
              {
                steps: [
                  {
                    instruction: "Sla rechtsaf",
                    distance: 200,
                    duration: 15,
                    way_points: [1, 1],
                  },
                ],
              },
            ],
          },
        },
      ],
    });

    const response = await provider.getRoute({
      coordinates: [
        [5.12, 52.09],
        [5.11, 52.09],
      ],
      profile: "bike",
      options: { instructions: true },
    });

    expect(response.routes[0].maneuvers?.[0].coordinate).toEqual([
      5.11, 52.09,
    ]);
  });

  it("maps ORS JSON snap results one-to-one to input coordinates", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      locations: [
        {
          location: [5.1215, 52.0907],
          name: "Street A",
          snapped_distance: 7.5,
        },
        null,
        {
          location: [5.1281, 52.0851],
          snapped_distance: 4,
        },
      ],
    });

    const coordinates: [number, number][] = [
      [5.12142, 52.09063],
      [0, 0],
      [5.128, 52.085],
    ];

    const response = await provider.getNearest({
      coordinates,
      profile: "bike",
    });

    expect(response.points).toHaveLength(3);
    expect(response.points[0]).toEqual({
      sourceIndex: 0,
      inputCoordinate: coordinates[0],
      snappedPoint: {
        type: "Point",
        coordinates: [5.1215, 52.0907],
      },
      distanceMeters: 7.5,
      streetName: "Street A",
    });
    expect(response.points[1]).toEqual({
      sourceIndex: 1,
      inputCoordinate: coordinates[1],
      snappedPoint: null,
      distanceMeters: null,
    });
    expect(response.points[2]).toEqual({
      sourceIndex: 2,
      inputCoordinate: coordinates[2],
      snappedPoint: {
        type: "Point",
        coordinates: [5.1281, 52.0851],
      },
      distanceMeters: 4,
      streetName: undefined,
    });
  });

  it("preserves null cells in matrix responses", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      durations: [
        [0, null],
        [12, 0],
      ],
      distances: [
        [0, null],
        [50, 0],
      ],
    });

    const response = await provider.getMatrix({
      coordinates: [
        [5.12, 52.09],
        [5.11, 52.09],
      ],
      profile: "car",
    });

    expect(response.durations[0][1]).toBeNull();
    expect(response.distances[0][1]).toBeNull();
  });

  it("throws INVALID_RESPONSE for malformed provider data", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      features: [{ geometry: { type: "LineString", coordinates: [] } }],
    });

    await expect(
      provider.getRoute({
        coordinates: [
          [5.12, 52.09],
          [5.11, 52.09],
        ],
        profile: "car",
      }),
    ).rejects.toMatchObject({
      name: "WayboundError",
      code: "INVALID_RESPONSE",
      provider: "OpenRouteService",
    });
  });
});
