import {
  ProfileType,
  RouteQuery,
  HttpRequest,
  NearestQuery,
  MatrixQuery,
  IsochroneQuery,
} from "#types";
import { normalizeBaseUrl } from "../base-url";

const DEFAULT_BASE_URL = "https://api.heigit.org/openrouteservice";

export class OrsRequestBuilder {
  private readonly baseUrl: string;
  private apiKey?: string;

  constructor(apiKey?: string, baseUrl = DEFAULT_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = normalizeBaseUrl(baseUrl, "OpenRouteService");
  }

  private mapProfile(profile: ProfileType): string {
    const profileMap: Record<ProfileType, string> = {
      bike: "cycling-regular",
      hike: "foot-hiking",
      car: "driving-car",
    };
    return profileMap[profile];
  }

  private getBaseHeaders(): Record<string, string> {
    return {
      ...(this.apiKey ? { Authorization: this.apiKey } : {}),
      "Content-Type": "application/json",
      Accept: "application/json, application/geo+json",
    };
  }

  public buildRouteRequest({
    options,
    coordinates,
    profile,
  }: RouteQuery): HttpRequest {
    const mappedProfile = this.mapProfile(profile);
    const url = `${this.baseUrl}/v2/directions/${mappedProfile}/geojson`;

    return {
      url,
      method: "POST",
      headers: this.getBaseHeaders(),
      body: JSON.stringify({
        coordinates,
        elevation: options?.elevation ?? false,
        instructions: options?.instructions ?? true,
        instructions_format: "text",
        language: options?.language,
      }),
    };
  }

  public buildNearestRequest(query: NearestQuery): HttpRequest {
    const mappedProfile = this.mapProfile(query.profile);
    const url = `${this.baseUrl}/v2/snap/${mappedProfile}/json`;

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
