import type { LineString, MultiPolygon, Polygon } from "geojson";

export interface OrsDirectionsResponse {
  features?: OrsRouteFeature[];
}

export interface OrsRouteFeature {
  geometry?: LineString;
  properties?: {
    summary?: {
      distance?: number;
      duration?: number;
      weight?: number;
    };
    segments?: OrsSegment[];
    waypoint_order?: number[];
  };
}

export interface OrsSegment {
  steps?: OrsStep[];
}

export interface OrsStep {
  instruction?: string;
  distance?: number;
  duration?: number;
  way_points?: [number, number];
}

export interface OrsSnapResponse {
  locations?: (OrsSnapLocation | null)[];
}

export interface OrsSnapLocation {
  location?: number[];
  name?: string;
  snapped_distance?: number;
}

export interface OrsMatrixResponse {
  durations?: (number | null)[][];
  distances?: (number | null)[][];
}

export interface OrsIsochroneResponse {
  features?: OrsIsochroneFeature[];
}

export interface OrsIsochroneFeature {
  geometry?: Polygon | MultiPolygon;
  properties?: {
    value?: number;
  };
}
