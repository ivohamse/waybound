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

type IsochroneGeometry = {
  geometry: Polygon | MultiPolygon;
};

export type IsochroneResult =
  | (IsochroneGeometry & { duration: number })
  | (IsochroneGeometry & { distance: number });

export interface IsochroneResponse {
  provider: string;
  isochrones: IsochroneResult[];
}
