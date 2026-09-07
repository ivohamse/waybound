import type { LineString, MultiPolygon, Polygon } from "geojson";
import type { Coordinate } from "#types";

export function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

export function isLineString(value: unknown): value is LineString {
  if (!value || typeof value !== "object") return false;

  const geometry = value as Partial<LineString>;
  return (
    geometry.type === "LineString" &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length >= 2 &&
    geometry.coordinates.every(isCoordinate)
  );
}

function isLinearRing(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(isCoordinate)
  );
}

export function isPolygonGeometry(
  value: unknown,
): value is Polygon | MultiPolygon {
  if (!value || typeof value !== "object") return false;

  const geometry = value as Partial<Polygon | MultiPolygon>;

  if (geometry.type === "Polygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 &&
      geometry.coordinates.every(isLinearRing)
    );
  }

  if (geometry.type === "MultiPolygon") {
    return (
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length > 0 &&
      geometry.coordinates.every(
        (polygon) =>
          Array.isArray(polygon) &&
          polygon.length > 0 &&
          polygon.every(isLinearRing),
      )
    );
  }

  return false;
}

export function isNullableNumberMatrix(
  value: unknown,
  rows: number,
  columns = rows,
): value is (number | null)[][] {
  return (
    Array.isArray(value) &&
    value.length === rows &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === columns &&
        row.every(
          (cell) => cell === null || (typeof cell === "number" && Number.isFinite(cell)),
        ),
    )
  );
}
