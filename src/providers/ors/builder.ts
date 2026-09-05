import {
  ProfileType,
  RouteFeature,
  RouteQuery,
  HttpRequest,
  NearestQuery,
  MatrixQuery,
  IsochroneQuery,
  AvoidFeatureType,
} from "#types";

export class OrsRequestBuilder {
  private readonly baseUrl = "https://api.heigit.org/openrouteservice";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private mapProfile(profile: ProfileType): string {
    const profileMap: Record<ProfileType, string> = {
      bike: "cycling-regular",
      hike: "foot-hiking",
      car: "driving-car",
    };
    return profileMap[profile];
  }

  /**
   * Vertaalt waybound restricties naar het specifieke ORS v2 dialect
   */
  private mapAvoidFeature(feature: AvoidFeatureType): string {
    const featureMap: Record<AvoidFeatureType, string> = {
      tolls: "tollways",
      highways: "highways",
      ferries: "ferries",
    };
    return featureMap[feature];
  }

  private buildUrl(feature: RouteFeature, profile: ProfileType): string {
    const mappedProfile = this.mapProfile(profile);
    const featurePath = feature === "snap" ? "snap" : "directions";
    return `${this.baseUrl}/v2/${featurePath}/${mappedProfile}/geojson`;
  }

  private getBaseHeaders(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json",
    };
  }

  public buildRouteRequest({
    options,
    coordinates,
    profile,
  }: RouteQuery): HttpRequest {
    const url = this.buildUrl("directions", profile);

    const requestBody: Record<string, any> = {
      coordinates: coordinates,
      elevation: options?.elevation ?? false,
      instructions: options?.instructions ?? true,
      instructions_format: "text",
      language: options?.language,
    };

    if (options) {
      const { avoidFeatures, optimize } = options;
      const features = avoidFeatures ?? [];

      requestBody.options = {
        optimized: optimize,
        avoid_features: features
          .map((f) => this.mapAvoidFeature(f))
          .filter((f) => !(profile === "hike" && f === "tollways")),
      };
    }

    console.log(JSON.stringify(requestBody));

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify(requestBody),
    };
  }

  public buildNearestRequest(query: NearestQuery): HttpRequest {
    const url = this.buildUrl("snap", query.profile);

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify({
        locations: [query.coordinate],
        radius: query.options?.radius ?? 300,
      }),
    };
  }

  /**
   * NIEUW IN v0.2.0: Bouwt het HTTP verzoek voor de Matrix API (POST /v2/matrix/{profile})
   */
  public buildMatrixRequest(query: MatrixQuery): HttpRequest {
    const mappedProfile = this.mapProfile(query.profile);
    // Matrix endpoint heeft geen /geojson extensie
    const url = `${this.baseUrl}/v2/matrix/${mappedProfile}`;

    const requestBody: Record<string, any> = {
      locations: query.coordinates,
      // We vragen expliciet zowel reistijden als afstanden op
      metrics: ["duration", "distance"],
    };

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify(requestBody),
    };
  }

  /**
   * NIEUW IN v0.2.0: Bouwt het HTTP verzoek voor Isochronen (POST /v2/isochrones/{profile})
   */
  public buildIsochroneRequest(query: IsochroneQuery): HttpRequest {
    const mappedProfile = this.mapProfile(query.profile);
    const url = `${this.baseUrl}/v2/isochrones/${mappedProfile}`;

    const requestBody: Record<string, any> = {
      locations: [query.coordinate],
      range: query.options.ranges, // Bijv. [900, 1800] (15 en 30 minuten)
      range_type: query.options.rangeType === "distance" ? "distance" : "time",
    };

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify(requestBody),
    };
  }
}
