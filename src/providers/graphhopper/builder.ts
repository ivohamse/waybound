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

  /**
   * INTERNE URL BUILDER
   * Voegt altijd de verplichte API-key toe aan de query parameters.
   */
  private buildUrl(
    feature: RouteFeature,
    queryParams?: Record<string, string | number | boolean>,
  ): string {
    const endpoint = this.mapFeatureEndpoint(feature);
    const urlObj = new URL(`${this.baseUrl}/${endpoint}`);

    // De API-sleutel is ALTIJD verplicht in de URL string voor GraphHopper
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

  /**
   * Bouwt het HTTP verzoek voor routeberekening (POST /route)
   */
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

  /**
   * Bouwt het HTTP verzoek voor snapping/reverse geocoding (GET /geocode)
   */
  public buildNearestRequest(query: NearestQuery): HttpRequest {
    const [lng, lat] = query.coordinate;

    const url = this.buildUrl("snap", {
      reverse: "true",
      point: `${lat},${lng}`, // GraphHopper verwacht 'lat,lng'
      provider: "default",
      profile: this.mapProfile(query.profile),
      locale: query.options?.language || "en",
    });

    return {
      url,
      method: "GET",
      headers: {}, // Geen content-type of body nodig voor deze GET-actie
    };
  }

  /**
   * NIEUW IN v0.2.0: Bouwt het HTTP verzoek voor de GraphHopper Matrix API (POST /api/1/matrix)
   */
  public buildMatrixRequest(query: MatrixQuery): HttpRequest {
    const url = this.buildUrl("matrix");

    const requestBody: Record<string, any> = {
      points: query.coordinates,
      profile: this.mapProfile(query.profile),
      // We vragen expliciet reistijden (times) en afstanden op
      out_arrays: ["times", "distances", "weights"],
    };

    return {
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    };
  }

  /**
   * NIEUW IN v0.2.0: Bouwt het HTTP verzoek voor Isochronen (GET /isochrone)
   */
  public buildIsochroneRequest(query: IsochroneQuery): HttpRequest {
    const [lng, lat] = query.coordinate;

    // We pakken de eerste range limiet uit de array conform GraphHopper GET limitaties
    const limitValue = query.options.ranges?.[0] ?? 900;
    const isDistance = query.options.rangeType === "distance";

    const urlParams: Record<string, any> = {
      point: `${lat},${lng}`,
      buckets: query.options.ranges?.length ?? 1,
    };

    if (isDistance) {
      urlParams.distance_limit = limitValue; // in meters
    } else {
      urlParams.time_limit = limitValue; // in seconden
    }

    const url = this.buildUrl("isochrones", urlParams);

    return {
      url,
      method: "GET",
      headers: {},
    };
  }
}
