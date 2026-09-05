import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphHopperProvider } from "./index";
import { GraphHopperClient } from "./client";
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
          time: 120000, // 120.000 ms = 120 seconden
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

    // We kapen de execute methode op het prototype van de GraphHopperClient
    const executeSpy = vi
      .spyOn(GraphHopperClient.prototype, "execute")
      .mockResolvedValue(mockGraphHopperResponse);

    const query: RouteQuery = {
      coordinates: [
        [5.11, 52.09],
        [5.12, 52.09],
      ],
      profile: "bike",
    };

    const response = await provider.getRoute(query);

    // CONTROLEER DE TRANSFORMATIE: Klopt de omrekening en de structuur?
    expect(response.provider).toBe("GraphHopper");
    expect(response.routes).toHaveLength(1);

    const mainRoute = response.routes[0];
    expect(mainRoute.distanceMeters).toBe(850.0);
    expect(mainRoute.durationSeconds).toBe(120); // Gecontroleerd op ms -> seconden deling!
    expect(mainRoute.weight).toBe(15.5);
    expect(mainRoute.geometry.type).toBe("LineString");

    expect(executeSpy).toHaveBeenCalled();
  });

  it("zou een fout moeten gooien als de server een lege paths array stuurt", async () => {
    vi.spyOn(GraphHopperClient.prototype, "execute").mockResolvedValue({
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
          // Simulatie van GraphHopper's instructie array
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

    vi.spyOn(GraphHopperClient.prototype, "execute").mockResolvedValue(
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

    // Controleer de GraphHopper turn-by-turn conversie (inclusief ms -> sec deling!)
    expect(route.maneuvers).toBeDefined();
    expect(route.maneuvers).toHaveLength(1);
    expect(route.maneuvers![0].instruction).toBe("Sla linksaf richting Neude");
    expect(route.maneuvers![0].durationSeconds).toBe(20); // 20000ms / 1000
    expect(route.maneuvers![0].coordinate).toEqual([5.11, 52.09]);
  });
});

const testManeuvers = (provider: GraphHopperProvider) => {
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
          // Simulatie van GraphHopper's instructie array
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

    vi.spyOn(GraphHopperClient.prototype, "execute").mockResolvedValue(
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

    // Controleer de GraphHopper turn-by-turn conversie (inclusief ms -> sec deling!)
    expect(route.maneuvers).toBeDefined();
    expect(route.maneuvers).toHaveLength(1);
    expect(route.maneuvers![0].instruction).toBe("Sla linksaf richting Neude");
    expect(route.maneuvers![0].durationSeconds).toBe(20); // 20000ms / 1000
    expect(route.maneuvers![0].coordinate).toEqual([5.11, 52.09]);
  });
};
