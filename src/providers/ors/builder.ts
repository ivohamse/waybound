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

    const requestBody: Record<string, unknown> = {
      coordinates,
      elevation: options?.elevation ?? false,
      instructions: options?.instructions ?? true,
      instructions_format: "text",
      language: options?.language,
    };

    const avoidFeatures = (options?.avoidFeatures ?? [])
      .map((feature) => this.mapAvoidFeature(feature))
      .filter((feature) => !(profile === "hike" && feature === "tollways"));

    if (avoidFeatures.length > 0) {
      requestBody.options = {
        avoid_features: avoidFeatures,
      };
    }

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
        locations: query.coordinates,
        radius: query.options?.radius ?? 300,
      }),
    };
  }

  public buildMatrixRequest(query: MatrixQuery): HttpRequest {
    const mappedProfile = this.mapProfile(query.profile);
    const url = `${this.baseUrl}/v2/matrix/${mappedProfile}`;

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify({
        locations: query.coordinates,
        metrics: ["duration", "distance"],
      }),
    };
  }

  public buildIsochroneRequest(query: IsochroneQuery): HttpRequest {
    const mappedProfile = this.mapProfile(query.profile);
    const url = `${this.baseUrl}/v2/isochrones/${mappedProfile}`;

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify({
        locations: [query.coordinate],
        range: query.options.ranges,
        range_type: query.options.rangeType === "distance" ? "distance" : "time",
      }),
    };
  }
}
