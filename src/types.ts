import { LineString, Polygon, MultiPolygon } from "geojson";
import type { ProviderCapabilities } from "./capabilities";

export type Coordinate = [longitude: number, latitude: number];
export type ProfileType = "bike" | "hike" | "car";
export type RouteFeature = "directions" | "snap" | "matrix" | "isochrones";

export interface BaseOptions {
  language?: string;
}

// ==========================================
// 1. DIRECTIONS
// ==========================================
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

// ==========================================
// 2. SNAPPING / NEAREST
// ==========================================
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
  snappedCoordinate: Coordinate | null;
  distanceMeters: number | null;
  streetName?: string;
}

export interface NearestResponse {
  provider: string;
  points: NearestResult[];
}

// ==========================================
// 3. MATRIX TYPES
// ==========================================
export interface MatrixOptions extends BaseOptions {}

export interface MatrixQuery {
  coordinates: Coordinate[];
  profile: ProfileType;
  options?: MatrixOptions;
}

export interface MatrixResponse {
  provider: string;
  durations: (number | null)[][];
  distances: (number | null)[][];
}

// ==========================================
// 4. ISOCHRONES TYPES
// ==========================================
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

// ==========================================
// CENTRAL PROVIDER BLUEPRINT
// ==========================================
export interface RoutingProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  getRoute(query: RouteQuery): Promise<RouteResponse>;
  getNearest(query: NearestQuery): Promise<NearestResponse>;
  getMatrix(query: MatrixQuery): Promise<MatrixResponse>;
  getIsochrones(query: IsochroneQuery): Promise<IsochroneResponse>;
}

export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
}
