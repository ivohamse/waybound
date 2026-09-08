import type { Coordinate, ProfileType } from "./common";

export interface MatrixOptions {}

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
