import {
  RouteQuery,
  NearestQuery,
  HttpRequest,
  ProfileType,
  RouteFeature,
  MatrixQuery,
  IsochroneQuery,
} from "#types";

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
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });
    }

    return urlObj.toString();
  }

  public buildRouteRequest(query: RouteQuery): HttpRequest {
    const url = this.buildUrl("directions");

    const requestBody: Record<string, any> = {
      points: query.coordinates,
      profile: this.mapProfile(query.profile),
      points_encoded: false,
      instructions: query.options?.instructions ?? true,
      locale: query.options?.language,
      optimize: query.options?.optimize,
    };

    if (
      query.options?.avoidFeatures &&
      query.options.avoidFeatures.includes("tolls")
    ) {
      requestBody["ch.disable"] = true;
    }

    return {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    };
  }

  public buildNearestRequest(query: NearestQuery): HttpRequest {
    const [lng, lat] = query.coordinate;

    const url = this.buildUrl("snap", {
      reverse: "true",
      point: `${lat},${lng}`,
      provider: "default",
      profile: this.mapProfile(query.profile),
      locale: query.options?.language || "en",
    });

    return {
      url,
      method: "GET",
      headers: {},
    };
  }

  public buildMatrixRequest(query: MatrixQuery): HttpRequest {
    const url = this.buildUrl("matrix");

    const requestBody: Record<string, any> = {
      points: query.coordinates,
      profile: this.mapProfile(query.profile),
      out_arrays: ["times", "distances", "weights"],
    };

    return {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    };
  }

  public buildIsochroneRequest(query: IsochroneQuery): HttpRequest {
    const [lng, lat] = query.coordinate;

    const limitValue = query.options.ranges?.[0] ?? 900;
    const isDistance = query.options.rangeType === "distance";

    const urlParams: Record<string, any> = {
      point: `${lat},${lng}`,
      buckets: query.options.ranges?.length ?? 1,
    };

    if (isDistance) {
      urlParams.distance_limit = limitValue;
    } else {
      urlParams.time_limit = limitValue;
    }

    const url = this.buildUrl("isochrones", urlParams);

    return {
      url,
      method: "GET",
      headers: {},
    };
  }
}
