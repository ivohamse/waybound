import {
  RouteQuery,
  NearestQuery,
  HttpRequest,
  ProfileType,
  RouteFeature,
  MatrixQuery,
  IsochroneQuery,
  Coordinate,
} from "#types";

export interface GraphHopperIsochroneRequest {
  request: HttpRequest;
  value: number;
}

export class GraphHopperRequestBuilder {
  private readonly baseUrl = "https://graphhopper.com/api/1";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private mapProfile(profile: ProfileType): string {
    const profileMap: Record<ProfileType, string> = {
      bike: "bike",
      hike: "hike",
      car: "car",
    };
    return profileMap[profile];
  }

  private mapFeatureEndpoint(feature: RouteFeature): string {
    const featureMap: Record<RouteFeature, string> = {
      directions: "route",
      snap: "geocode",
      matrix: "matrix",
      isochrones: "isochrone",
    };
    return featureMap[feature];
  }

  private buildUrl(
    feature: RouteFeature,
    queryParams?: Record<string, string | number | boolean>,
  ): string {
    const endpoint = this.mapFeatureEndpoint(feature);
    const urlObj = new URL(`${this.baseUrl}/${endpoint}`);

    urlObj.searchParams.append("key", this.apiKey);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value));
      });
    }

    return urlObj.toString();
  }

  public buildRouteRequest(query: RouteQuery): HttpRequest {
    const url = this.buildUrl("directions");

    const requestBody: Record<string, unknown> = {
      points: query.coordinates,
      profile: this.mapProfile(query.profile),
      points_encoded: false,
      instructions: query.options?.instructions ?? true,
      locale: query.options?.language,
      optimize: query.options?.optimize,
    };

    return {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    };
  }

  public buildNearestRequests(query: NearestQuery): HttpRequest[] {
    return query.coordinates.map((coordinate) =>
      this.buildNearestRequestForCoordinate(coordinate, query.options?.language),
    );
  }

  private buildNearestRequestForCoordinate(
    coordinate: Coordinate,
    language?: string,
  ): HttpRequest {
    const [lng, lat] = coordinate;
    const url = this.buildUrl("snap", {
      reverse: true,
      point: `${lat},${lng}`,
      provider: "default",
      locale: language ?? "en",
    });

    return {
      url,
      method: "GET",
      headers: {},
    };
  }

  public buildMatrixRequest(query: MatrixQuery): HttpRequest {
    const url = this.buildUrl("matrix");

    return {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: query.coordinates,
        profile: this.mapProfile(query.profile),
        out_arrays: ["times", "distances"],
      }),
    };
  }

  /**
   * GraphHopper's Isochrone endpoint accepts one limit and evenly-spaced buckets.
   * Waybound exposes exact range values, so we issue one one-bucket request per
   * requested range to preserve the public contract for arbitrary ranges.
   */
  public buildIsochroneRequests(
    query: IsochroneQuery,
  ): GraphHopperIsochroneRequest[] {
    const [lng, lat] = query.coordinate;
    const isDistance = query.options.rangeType === "distance";

    return query.options.ranges.map((value) => {
      const params: Record<string, string | number | boolean> = {
        point: `${lat},${lng}`,
        profile: this.mapProfile(query.profile),
        buckets: 1,
      };

      if (isDistance) {
        params.distance_limit = value;
      } else {
        params.time_limit = value;
      }

      return {
        value,
        request: {
          url: this.buildUrl("isochrones", params),
          method: "GET",
          headers: {},
        },
      };
    });
  }
}
