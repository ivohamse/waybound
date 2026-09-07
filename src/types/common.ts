export type Coordinate = [longitude: number, latitude: number];
export type ProfileType = "bike" | "hike" | "car";
export type RouteFeature = "directions" | "snap" | "matrix" | "isochrones";

export interface BaseOptions {
  language?: string;
}

export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
}
