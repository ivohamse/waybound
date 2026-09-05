import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouteServiceProvider } from "./index";
import { OrsClient } from "./client"; // Importeer de echte clientklasse
import { RouteQuery } from "#types";

describe("OpenRouteServiceProvider", () => {
  let provider: OpenRouteServiceProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new OpenRouteServiceProvider("test-api-key");
  });

  it("zou de rauwe ORS v2 JSON correct moeten transformeren naar een waybound RouteResponse", async () => {
    const mockOrsRouteResponse = {
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
            summary: {
              distance: 1250.5,
              duration: 180,
              weight: 42,
            },
          },
        },
      ],
    };

    // KOGELVRIJE MOCK: We kapen de execute methode direct op het 'prototype' van de klasse
    const executeSpy = vi
      .spyOn(OrsClient.prototype, "execute")
      .mockResolvedValue(mockOrsRouteResponse);

    const query: RouteQuery = {
      coordinates: [
        [5.12, 52.09],
        [5.11, 52.09],
      ],
      profile: "bike",
    };

    const response = await provider.getRoute(query);

    expect(response.provider).toBe("OpenRouteService");
    expect(response.routes).toHaveLength(1);

    const mainRoute = response.routes[0];
    expect(mainRoute.distanceMeters).toBe(1250.5);
    expect(mainRoute.durationSeconds).toBe(180);
    expect(mainRoute.weight).toBe(42);
    expect(mainRoute.geometry.type).toBe("LineString");
    expect(mainRoute.geometry.coordinates).toEqual([
      [5.12, 52.09],
      [5.11, 52.09],
    ]);

    expect(executeSpy).toHaveBeenCalled();
  });

  it("zou een fout moeten gooien als de server een lege feature collectie stuurt", async () => {
    vi.spyOn(OrsClient.prototype, "execute").mockResolvedValue({
      features: [],
    });

    const query: RouteQuery = {
      coordinates: [
        [5.12, 52.09],
        [5.11, 52.09],
      ],
      profile: "car",
    };

    await expect(provider.getRoute(query)).rejects.toThrow(
      "ORS returned an empty feature collection for this route query.",
    );
  });

  it("zou de rauwe ORS v2 JSON inclusief turn-by-turn maneuvers correct moeten transformeren", async () => {
    const mockOrsRouteResponse = {
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
            summary: { distance: 1000, duration: 60, weight: 10 },
            // Simulatie van de turn-by-turn data van ORS
            segments: [
              {
                steps: [
                  {
                    instruction: "Sla rechtsaf de Donkeregaard op",
                    distance: 200,
                    duration: 15,
                    way_points: [0, 1],
                  },
                ],
              },
            ],
          },
        },
      ],
    };

    vi.spyOn(OrsClient.prototype, "execute").mockResolvedValue(
      mockOrsRouteResponse,
    );

    const query: RouteQuery = {
      coordinates: [
        [5.12, 52.09],
        [5.11, 52.09],
      ],
      profile: "bike",
      options: { instructions: true },
    };

    const response = await provider.getRoute(query);
    const route = response.routes[0];

    // Controleer of de maneuvers succesvol zijn meegeleverd en geformatteerd
    expect(route.maneuvers).toBeDefined();
    expect(route.maneuvers).toHaveLength(1);
    expect(route.maneuvers![0].instruction).toBe(
      "Sla rechtsaf de Donkeregaard op",
    );
    expect(route.maneuvers![0].distanceMeters).toBe(200);
    expect(route.maneuvers![0].coordinate).toEqual([5.12, 52.09]); // Eerste waypoint index check
  });
});
