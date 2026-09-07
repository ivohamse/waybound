import type { MultiPolygon, Polygon } from "geojson";
import type { BaseOptions, Coordinate, ProfileType } from "./common";

export interface IsochroneOptions extends BaseOptions {
  rangeType: "time" | "distance";
  ranges: number[];
}

export interface IsochroneQuery {
  coordinate: Coordinate;
  profile: ProfileType;
  options: IsochroneOptions;
}

export interface IsochroneResult {
  value: number;
  geometry: Polygon | MultiPolygon;
}

export interface IsochroneResponse {
  provider: string;
  isochrones: IsochroneResult[];
}
