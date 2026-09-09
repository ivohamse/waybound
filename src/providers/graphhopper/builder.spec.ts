import { describe, it, expect } from "vitest";
import { GraphHopperRequestBuilder } from "./builder";
import type { RouteQuery } from "#types";

describe("GraphHopperRequestBuilder", () => {
  const mockApiKey = "gh-api-key-999";
  const builder = new GraphHopperRequestBuilder(mockApiKey);

  it("builds a route request with shared route options", () => {
    const query: RouteQuery = {
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "bike",
      options: {
        instructions: false,
        language: "nl",
        elevation: true,
      },
    };

    const request = builder.buildRouteRequest(query);
    const url = new URL(request.url);
    const body = JSON.parse(request.body!);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("graphhopper.com");
    expect(url.searchParams.get("key")).toBe(mockApiKey);
    expect(request.method).toBe("POST");
    expect(body.profile).toBe("bike");
    expect(body.points_encoded).toBe(false);
    expect(body.points).toEqual(query.coordinates);
    expect(body.instructions).toBe(false);
    expect(body.locale).toBe("nl");
    expect(body.elevation).toBe(true);
  });

  it("maps the shared hike profile to GraphHopper foot", () => {
    const request = builder.buildRouteRequest({
      coordinates: [
        [5.121, 52.09],
        [5.111, 52.09],
      ],
      profile: "hike",
    });

    const body = JSON.parse(request.body!);
    expect(body.profile).toBe("foot");
  });

  it("builds one reverse-geocoding request per nearest coordinate", () => {
    const requests = builder.buildNearestRequests({
      coordinates: [
        [5.12142, 52.09063],
        [5.11142, 52.09],
      ],
      profile: "hike",
    });

    expect(requests).toHaveLength(2);

    const firstUrl = new URL(requests[0].url);
    const secondUrl = new URL(requests[1].url);

    expect(firstUrl.searchParams.get("reverse")).toBe("true");
    expect(firstUrl.searchParams.get("point")).toBe("52.09063,5.12142");
    expect(secondUrl.searchParams.get("point")).toBe("52.09,5.11142");
    expect(firstUrl.searchParams.get("profile")).toBeNull();
    expect(requests[0].method).toBe("GET");
  });

  it("builds one exact-range isochrone request per requested range", () => {
    const requests = builder.buildIsochroneRequests({
      coordinate: [5.12142, 52.09063],
      profile: "bike",
      options: {
        rangeType: "time",
        ranges: [300, 900],
      },
    });

    expect(requests.map(({ value }) => value)).toEqual([300, 900]);

    const firstUrl = new URL(requests[0].request.url);
    const secondUrl = new URL(requests[1].request.url);

    expect(firstUrl.searchParams.get("profile")).toBe("bike");
    expect(firstUrl.searchParams.get("buckets")).toBe("1");
    expect(firstUrl.searchParams.get("time_limit")).toBe("300");
    expect(secondUrl.searchParams.get("time_limit")).toBe("900");
  });

  it("does not append an empty API key", () => {
    const request = new GraphHopperRequestBuilder().buildRouteRequest({
      coordinates: [[5.121, 52.09], [5.111, 52.09]],
      profile: "hike",
    });

    expect(new URL(request.url).searchParams.has("key")).toBe(false);
  });

  it("uses a normalized custom API root", () => {
    const request = new GraphHopperRequestBuilder(undefined, "http://localhost:8989/api/1/")
      .buildRouteRequest({ coordinates: [[5.121, 52.09], [5.111, 52.09]], profile: "hike" });

    const url = new URL(request.url);
    expect(url.origin).toBe("http://localhost:8989");
    expect(url.pathname).toBe("/api/1/route");
  });

  it("rejects an invalid custom API root", () => {
    expect(() => new GraphHopperRequestBuilder(undefined, "/api/1")).toThrow(
      "baseUrl must be an absolute HTTP(S) URL",
    );
  });
});
