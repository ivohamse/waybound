import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GraphHopperProvider } from "./index";
import { HttpClient } from "../../http/client";
import type { RouteQuery } from "#types";

afterEach(() => vi.unstubAllGlobals());

describe("GraphHopperProvider", () => {
  let provider: GraphHopperProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new GraphHopperProvider({ authentication: { type: "api-key", value: "test-gh-key" } });
  });

  it("transforms a GraphHopper route response", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      paths: [
        {
          distance: 850,
          time: 120000,
          weight: 15.5,
          points: {
            type: "LineString",
            coordinates: [
              [5.11, 52.09],
              [5.12, 52.09],
            ],
          },
          points_order: [0, 2, 1],
        },
      ],
    });

    const query: RouteQuery = {
      coordinates: [
        [5.11, 52.09],
        [5.12, 52.09],
      ],
      profile: "bike",
    };

    const response = await provider.getRoute(query);
    const route = response.routes[0];

    expect(response.provider).toBe("GraphHopper");
    expect(route.distance).toBe(850);
    expect(route.duration).toBe(120);
    expect(route).not.toHaveProperty("weight");
    expect(route).not.toHaveProperty("waypointOrder");
  });

  it("uses instruction.interval to locate maneuvers", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      paths: [
        {
          distance: 850,
          time: 120000,
          points: {
            type: "LineString",
            coordinates: [
              [5.11, 52.09],
              [5.12, 52.09],
            ],
          },
          instructions: [
            {
              text: "Sla linksaf richting Neude",
              distance: 150,
              time: 20000,
              interval: [1, 1],
            },
          ],
        },
      ],
    });

    const response = await provider.getRoute({
      coordinates: [
        [5.11, 52.09],
        [5.12, 52.09],
      ],
      profile: "bike",
    });

    expect(response.routes[0].maneuvers?.[0]).toMatchObject({
      instruction: "Sla linksaf richting Neude",
      duration: 20,
      distance: 150,
      coordinate: [5.12, 52.09],
    });
  });

  it("returns one ordered nearest result per input coordinate", async () => {
    vi.spyOn(HttpClient.prototype, "execute")
      .mockResolvedValueOnce({
        hits: [{ point: { lng: 5.1215, lat: 52.0907 }, name: "A" }],
      })
      .mockResolvedValueOnce({ hits: [] });

    const coordinates: [number, number][] = [
      [5.12142, 52.09063],
      [0, 0],
    ];

    const response = await provider.getNearest({
      coordinates,
      profile: "bike",
    });

    expect(response.points).toHaveLength(2);
    expect(response.points[0]).toMatchObject({
      sourceIndex: 0,
      inputCoordinate: coordinates[0],
      nearestPoint: {
        type: "Point",
        coordinates: [5.1215, 52.0907],
      },
      distance: null,
      streetName: "A",
    });
    expect(response.points[1]).toMatchObject({
      sourceIndex: 1,
      inputCoordinate: coordinates[1],
      nearestPoint: null,
      distance: null,
    });
  });

  it("preserves exact Waybound ranges across multiple isochrone requests", async () => {
    const validPolygon = {
      type: "Polygon" as const,
      coordinates: [
        [
          [5.12, 52.09],
          [5.13, 52.09],
          [5.13, 52.1],
          [5.12, 52.1],
          [5.12, 52.09],
        ],
      ],
    };

    vi.spyOn(HttpClient.prototype, "execute")
      .mockResolvedValueOnce({
        polygons: [
          {
            properties: { bucket: 0 },
            geometry: validPolygon,
          },
        ],
      })
      .mockResolvedValueOnce({
        polygons: [
          {
            properties: { bucket: 0 },
            geometry: validPolygon,
          },
        ],
      });

    const response = await provider.getIsochrones({
      coordinate: [5.12, 52.09],
      profile: "bike",
      options: { rangeType: "time", ranges: [300, 900] },
    });

    expect(
      response.isochrones.map((isochrone) =>
        "duration" in isochrone ? isochrone.duration : undefined,
      ),
    ).toEqual([300, 900]);
  });

  it("throws INVALID_RESPONSE for malformed provider data", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      paths: [{ distance: 100, time: 1000 }],
    });

    await expect(
      provider.getRoute({
        coordinates: [
          [5.11, 52.09],
          [5.12, 52.09],
        ],
        profile: "car",
      }),
    ).rejects.toMatchObject({
      name: "WayboundError",
      code: "INVALID_RESPONSE",
      provider: "GraphHopper",
    });
  });
});
