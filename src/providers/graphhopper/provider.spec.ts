import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphHopperProvider } from "./index";
import { HttpClient } from "../../http/client";
import { RouteQuery } from "#types";

describe("GraphHopperProvider", () => {
  let provider: GraphHopperProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new GraphHopperProvider("test-gh-key");
  });

  it("zou de rauwe GraphHopper paths JSON correct moeten transformeren naar een waybound RouteResponse", async () => {
    const mockGraphHopperResponse = {
      paths: [
        {
          distance: 850.0,
          time: 120000,
          weight: 15.5,
          points: {
            type: "LineString",
            coordinates: [
              [5.11, 52.09],
              [5.12, 52.09],
            ],
          },
        },
      ],
    };

    const executeSpy = vi
      .spyOn(HttpClient.prototype, "execute")
      .mockResolvedValue(mockGraphHopperResponse);

    const query: RouteQuery = {
      coordinates: [
        [5.11, 52.09],
        [5.12, 52.09],
      ],
      profile: "bike",
    };

    const response = await provider.getRoute(query);

    expect(response.provider).toBe("GraphHopper");
    expect(response.routes).toHaveLength(1);

    const mainRoute = response.routes[0];
    expect(mainRoute.distanceMeters).toBe(850.0);
    expect(mainRoute.durationSeconds).toBe(120);
    expect(mainRoute.weight).toBe(15.5);
    expect(mainRoute.geometry.type).toBe("LineString");

    expect(executeSpy).toHaveBeenCalled();
  });

  it("zou een fout moeten gooien als de server een lege paths array stuurt", async () => {
    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue({
      paths: [],
    });

    const query: RouteQuery = {
      coordinates: [
        [5.11, 52.09],
        [5.12, 52.09],
      ],
      profile: "car",
    };

    await expect(provider.getRoute(query)).rejects.toThrow(
      "GraphHopper returned no routing paths for this query",
    );
  });

  it("zou de rauwe GraphHopper paths JSON inclusief turn-by-turn maneuvers correct moeten transformeren", async () => {
    const mockGraphHopperResponse = {
      paths: [
        {
          distance: 850.0,
          time: 120000,
          weight: 15.5,
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
              points_index: 0,
            },
          ],
        },
      ],
    };

    vi.spyOn(HttpClient.prototype, "execute").mockResolvedValue(
      mockGraphHopperResponse,
    );

    const query: RouteQuery = {
      coordinates: [
        [5.11, 52.09],
        [5.12, 52.09],
      ],
      profile: "bike",
    };

    const response = await provider.getRoute(query);
    const route = response.routes[0];

    expect(route.maneuvers).toBeDefined();
    expect(route.maneuvers).toHaveLength(1);
    expect(route.maneuvers![0].instruction).toBe("Sla linksaf richting Neude");
    expect(route.maneuvers![0].durationSeconds).toBe(20);
    expect(route.maneuvers![0].coordinate).toEqual([5.11, 52.09]);
  });
});
