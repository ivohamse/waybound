import type { Point } from "geojson";
import type { BaseOptions, Coordinate, ProfileType } from "./common";

export interface NearestOptions extends BaseOptions {
  radius?: number;
}

export interface NearestQuery {
  coordinates: Coordinate[];
  profile: ProfileType;
  options?: NearestOptions;
}

export interface NearestResult {
  sourceIndex: number;
  inputCoordinate: Coordinate;
  snappedPoint: Point | null;
  distanceMeters: number | null;
  streetName?: string;
}

export interface NearestResponse {
  provider: string;
  points: NearestResult[];
}
