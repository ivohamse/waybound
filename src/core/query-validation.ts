import type {
  Coordinate,
  IsochroneQuery,
  MatrixQuery,
  NearestQuery,
  RouteQuery,
} from "#types";
import { WayboundError } from "./errors";

function invalidQuery(message: string): never {
  throw new WayboundError("INVALID_QUERY", message);
}

function assertCoordinate(coordinate: Coordinate, label: string): void {
  const [longitude, latitude] = coordinate;

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    invalidQuery(`${label} has an invalid longitude.`);
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    invalidQuery(`${label} has an invalid latitude.`);
  }
}

function assertCoordinates(coordinates: Coordinate[], minimum: number, label: string): void {
  if (coordinates.length < minimum) {
    invalidQuery(`${label} requires at least ${minimum} coordinate${minimum === 1 ? "" : "s"}.`);
  }

  coordinates.forEach((coordinate, index) => {
    assertCoordinate(coordinate, `${label} coordinate at index ${index}`);
  });
}

export function validateRouteQuery(query: RouteQuery): void {
  assertCoordinates(query.coordinates, 2, "RouteQuery");
}

export function validateNearestQuery(query: NearestQuery): void {
  assertCoordinates(query.coordinates, 1, "NearestQuery");

  const radius = query.options?.radius;
  if (radius !== undefined && (!Number.isFinite(radius) || radius <= 0)) {
    invalidQuery("NearestQuery radius must be a finite number greater than 0.");
  }
}

export function validateMatrixQuery(query: MatrixQuery): void {
  assertCoordinates(query.coordinates, 1, "MatrixQuery");
}

export function validateIsochroneQuery(query: IsochroneQuery): void {
  assertCoordinate(query.coordinate, "IsochroneQuery coordinate");

  if (query.options.ranges.length === 0) {
    invalidQuery("IsochroneQuery ranges must contain at least one value.");
  }

  query.options.ranges.forEach((range, index) => {
    if (!Number.isFinite(range) || range <= 0) {
      invalidQuery(
        `IsochroneQuery range at index ${index} must be a finite number greater than 0.`,
      );
    }
  });
}
