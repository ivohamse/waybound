import { describe, it, expect } from "vitest";
import { OrsRequestBuilder } from "./builder";
import { RouteQuery } from "#types";

describe("OrsRequestBuilder", () => {
  const mockApiKey = "mock-api-key-123";
  const builder = new OrsRequestBuilder(mockApiKey);

  it("zou een correcte HttpRequest voor een route moeten bouwen", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "hike",
    };

    const request = builder.buildRouteRequest(query);
    const expectedUrl = new URL(request.url);

    // 1. Controleer of de URL klopt en het profiel goed is gemapt naar 'foot-hiking'
    expect(expectedUrl.protocol).toBe("https:");
    expect(expectedUrl.hostname).toBe("api.heigit.org");

    expect(expectedUrl.pathname).contains("foot-hiking");
    expect(expectedUrl.pathname).contains("directions");

    // 2. Controleer of het een POST request is
    expect(request.method).toBe("POST");

    // 3. Controleer of de Authorization header correct is gevuld
    expect(request.headers["Authorization"]).toBe(mockApiKey);
    expect(request.headers["Content-Type"]).toBe("application/json");

    // 4. Controleer of de body correct is omgezet naar een JSON string met de coördinaten
    const parsedBody = JSON.parse(request.body!);
    expect(parsedBody.coordinates).toEqual(query.coordinates);
    expect(parsedBody.elevation).toBe(false); // Standaard fallback check
  });

  it("zou avoidFeatures correct in de request body moeten stoppen", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "bike",
      options: {
        avoidFeatures: ["highways", "tolls"],
      },
    };

    const request = builder.buildRouteRequest(query);
    const parsedBody = JSON.parse(request.body!);

    // Controleer of de array met restricties correct is doorgegeven aan ORS
    expect(parsedBody.options.avoid_features).toEqual(["highways", "tollways"]);
  });

  it("zou tolls correct moeten transformeren naar tollways voor een fiets- of autoprofiel", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "bike",
      options: {
        avoidFeatures: ["tolls"],
      },
    };

    const request = builder.buildRouteRequest(query);
    const parsedBody = JSON.parse(request.body!);

    // Controleer of 'tolls' succesvol is vertaald naar 'tollways'
    expect(parsedBody.options.avoid_features).toEqual(["tollways"]);
  });

  it("zou tollways keihard moeten wegfilteren als het profiel hike is (om 400 errors te voorkomen)", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "hike", // <--- Wandeltocht!
      options: {
        avoidFeatures: ["tolls", "highways"],
      },
    };

    const request = builder.buildRouteRequest(query);
    const parsedBody = JSON.parse(request.body!);

    // 'tollways' moet verdwenen zijn, maar 'highways' moet netjes blijven staan!
    expect(parsedBody.options.avoid_features).toEqual(["highways"]);
    expect(parsedBody.options.avoid_features).not.toContain("tollways");
  });
});
