import type { LineString } from "geojson";
import type { BaseOptions, Coordinate, ProfileType } from "./common";

export interface RouteOptions extends BaseOptions {
  elevation?: boolean;
  instructions?: boolean;
}

export interface RouteQuery {
  coordinates: Coordinate[];
  profile: ProfileType;
  options?: RouteOptions;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineString;
  weight?: number;
  maneuvers?: Maneuver[];
  waypointOrder?: number[];
}

export interface RouteResponse {
  provider: string;
  routes: RouteResult[];
}

export interface Maneuver {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinate: Coordinate;
}
