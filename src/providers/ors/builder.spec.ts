import { describe, it, expect } from "vitest";
import { OrsRequestBuilder } from "./builder";
import { RouteQuery } from "#types";

describe("OrsRequestBuilder", () => {
  const mockApiKey = "mock-api-key-123";
  const builder = new OrsRequestBuilder(mockApiKey);

  it("builds a valid route request", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "hike",
    };

    const request = builder.buildRouteRequest(query);
    const expectedUrl = new URL(request.url);

    expect(expectedUrl.protocol).toBe("https:");
    expect(expectedUrl.hostname).toBe("api.heigit.org");
    expect(expectedUrl.pathname).contains("foot-hiking");
    expect(expectedUrl.pathname).contains("directions");
    expect(request.method).toBe("POST");
    expect(request.headers.Authorization).toBe(mockApiKey);
    expect(request.headers["Content-Type"]).toBe("application/json");

    const parsedBody = JSON.parse(request.body!);
    expect(parsedBody.coordinates).toEqual(query.coordinates);
    expect(parsedBody.elevation).toBe(false);
  });

  it("maps avoid features to the ORS dialect", () => {
    const request = builder.buildRouteRequest({
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "bike",
      options: { avoidFeatures: ["highways", "tolls"] },
    });

    const parsedBody = JSON.parse(request.body!);
    expect(parsedBody.options.avoid_features).toEqual(["highways", "tollways"]);
  });

  it("filters tollways for hiking profiles", () => {
    const request = builder.buildRouteRequest({
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "hike",
      options: { avoidFeatures: ["tolls", "highways"] },
    });

    const parsedBody = JSON.parse(request.body!);
    expect(parsedBody.options.avoid_features).toEqual(["highways"]);
  });

  it("builds one native batch snap request for multiple coordinates", () => {
    const coordinates: [number, number][] = [
      [5.12142, 52.09063],
      [5.11142, 52.09],
    ];

    const request = builder.buildNearestRequest({
      coordinates,
      profile: "hike",
      options: { radius: 500 },
    });

    const url = new URL(request.url);
    const body = JSON.parse(request.body!);

    expect(url.pathname).toContain("/v2/snap/foot-hiking/geojson");
    expect(request.method).toBe("POST");
    expect(body.locations).toEqual(coordinates);
    expect(body.radius).toBe(500);
  });
});
