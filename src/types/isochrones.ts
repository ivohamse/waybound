import type { MultiPolygon, Polygon } from "geojson";
import type { Coordinate, ProfileType } from "./common";

export interface IsochroneOptions {
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
