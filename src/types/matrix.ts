import type { BaseOptions, Coordinate, ProfileType } from "./common";

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
