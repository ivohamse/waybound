import type { LineString, MultiPolygon, Polygon } from "geojson";

export interface GraphHopperRouteResponse {
  paths?: GraphHopperPath[];
}

export interface GraphHopperPath {
  distance?: number;
  time?: number;
  weight?: number;
  points?: LineString;
  instructions?: GraphHopperInstruction[];
  points_order?: number[];
}

export interface GraphHopperInstruction {
  text?: string;
  distance?: number;
  time?: number;
  interval?: [number, number];
}

export interface GraphHopperGeocodeResponse {
  hits?: GraphHopperGeocodeHit[];
}

export interface GraphHopperGeocodeHit {
  point?: {
    lat?: number;
    lng?: number;
  };
  name?: string;
  street?: string;
}

export interface GraphHopperMatrixResponse {
  times?: (number | null)[][];
  distances?: (number | null)[][];
}

export interface GraphHopperIsochroneResponse {
  polygons?: GraphHopperIsochronePolygon[];
}

export interface GraphHopperIsochronePolygon {
  geometry?: Polygon | MultiPolygon;
  properties?: {
    bucket?: number;
  };
}
