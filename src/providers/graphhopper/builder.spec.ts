import { describe, it, expect } from "vitest";
import { GraphHopperRequestBuilder } from "./builder";
import { RouteQuery, NearestQuery } from "#types";

describe("GraphHopperRequestBuilder", () => {
  const mockApiKey = "gh-api-key-999";
  const builder = new GraphHopperRequestBuilder(mockApiKey);

  it("zou een correcte HttpRequest voor een route moeten bouwen met profile in de body", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "bike",
    };

    const request = builder.buildRouteRequest(query);

    const expectedUrl = new URL(request.url);

    expect(expectedUrl.protocol).toBe("https:");
    expect(expectedUrl.hostname).toBe("graphhopper.com");
    expect(expectedUrl.searchParams.get("key")).toBe(mockApiKey);

    expect(request.method).toBe("POST");

    const parsedBody = JSON.parse(request.body!);
    expect(parsedBody.profile).toBe("bike");
    expect(parsedBody.points_encoded).toBe(false);
    expect(parsedBody.points).toEqual(query.coordinates);
  });

  it("zou een correcte Nearest GET request moeten bouwen met omdraaiing van coördinaten (Lat,Lng)", () => {
    const query: NearestQuery = {
      coordinate: [5.12142, 52.09063],
      profile: "hike",
    };

    const request = builder.buildNearestRequest(query);
    const expectedUrl = new URL(request.url);

    expect(expectedUrl.protocol).toBe("https:");
    expect(expectedUrl.hostname).toBe("graphhopper.com");
    expect(expectedUrl.searchParams.get("key")).toBe(mockApiKey);
    expect(expectedUrl.searchParams.get("reverse")).toBe("true");
    expect(expectedUrl.searchParams.get("point")).toBe("52.09063,5.12142");
    expect(expectedUrl.searchParams.get("profile")).toBe("hike");

    expect(request.method).toBe("GET");
    expect(request.body).toBeUndefined();
  });
});
