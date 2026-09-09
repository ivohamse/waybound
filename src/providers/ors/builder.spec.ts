import { describe, it, expect } from "vitest";
import { OrsRequestBuilder } from "./builder";
import type { RouteQuery } from "#types";

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
      options: { elevation: true },
    };

    const request = builder.buildRouteRequest(query);
    const url = new URL(request.url);
    const body = JSON.parse(request.body!);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("api.heigit.org");
    expect(url.pathname).toContain("/v2/directions/foot-hiking/geojson");
    expect(request.method).toBe("POST");
    expect(request.headers.Authorization).toBe(mockApiKey);
    expect(request.headers["Content-Type"]).toBe("application/json");
    expect(body.coordinates).toEqual(query.coordinates);
    expect(body.elevation).toBe(true);
  });

  it("builds one native JSON batch snap request for multiple coordinates", () => {
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

    expect(url.pathname).toContain("/v2/snap/foot-hiking/json");
    expect(request.method).toBe("POST");
    expect(body.locations).toEqual(coordinates);
    expect(body.radius).toBe(500);
  });

  it("does not send an empty Authorization header", () => {
    const request = new OrsRequestBuilder().buildRouteRequest({
      coordinates: [[5.121, 52.09], [5.111, 52.09]],
      profile: "hike",
    });

    expect(request.headers).not.toHaveProperty("Authorization");
  });
});
