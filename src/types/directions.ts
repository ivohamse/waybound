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
  distance: number;
  duration: number;
  geometry: LineString;
  maneuvers?: Maneuver[];
}

export interface RouteResponse {
  provider: string;
  routes: RouteResult[];
}

export interface Maneuver {
  instruction: string;
  distance: number;
  duration: number;
  coordinate: Coordinate;
}
