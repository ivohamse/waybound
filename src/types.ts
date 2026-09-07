import { LineString, Polygon, MultiPolygon } from "geojson";

export type Coordinate = [longitude: number, latitude: number];
export type ProfileType = "bike" | "hike" | "car";
export type RouteFeature = "directions" | "snap" | "matrix" | "isochrones";

export type AvoidFeatureType = "tolls" | "highways" | "ferries";

export interface BaseOptions {
  language?: string; // Bijv. 'nl', 'en'
}

// ==========================================
// 1. DIRECTIONS (Geüpdatet voor Alternatieve Routes)
// ==========================================
export interface RouteOptions extends BaseOptions {
  avoidFeatures?: AvoidFeatureType[];
  elevation?: boolean;
  alternatives?: number;
  optimize?: boolean;
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
  instruction: string; // Bijv: "Sla rechtsaf de Donkeregaard op"
  distanceMeters: number; // Afstand tot de volgende actie
  durationSeconds: number; // Tijd tot de volgende actie
  coordinate: Coordinate; // Waar de actie plaatsvindt [Lng, Lat]
}

// ==========================================
// 2. SNAPPING / NEAREST
// ==========================================
export interface NearestOptions extends BaseOptions {
  radius?: number;
}

export interface NearestQuery {
  coordinate: Coordinate;
  profile: ProfileType;
  options?: NearestOptions;
}

export interface NearestResponse {
  provider: string;
  snappedCoordinate: Coordinate;
  distanceMeters: number;
  streetName?: string;
}

// ==========================================
// 3. MATRIX TYPES
// ==========================================
export interface MatrixOptions extends BaseOptions {}

export interface MatrixQuery {
  coordinates: Coordinate[]; // Alle locaties die in de matrix meenemen
  profile: ProfileType;
  options?: MatrixOptions;
}

export interface MatrixResponse {
  provider: string;
  durations: number[][]; // 2D tabel met reistijden in seconden van A naar B
  distances: number[][]; // 2D tabel met afstanden in meters van A naar B
}

// ==========================================
// 4. ISOCHRONES TYPES
// ==========================================
export interface IsochroneOptions extends BaseOptions {
  rangeType: "time" | "distance";
  ranges: number[];
}

export interface IsochroneQuery {
  coordinate: Coordinate; // Het startpunt van waaruit je vertrekt
  profile: ProfileType;
  options: IsochroneOptions;
}

export interface IsochroneResult {
  value: number; // De waarde van de buffer (bijv. 900 seconden of 5000 meter)
  geometry: Polygon | MultiPolygon; // De GeoJSON vorm van het bereikbare gebied
}

export interface IsochroneResponse {
  provider: string;
  isochrones: IsochroneResult[];
}

// ==========================================
// CENTRAL PROVIDER BLUEPRINT (Uitgebreid!)
// ==========================================
export interface RoutingProvider {
  readonly name: string;
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
