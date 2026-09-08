import { describe, expect, it } from "vitest";
import {
  validateIsochroneQuery,
  validateMatrixQuery,
  validateNearestQuery,
  validateRouteQuery,
} from "./query-validation";

function expectInvalidQuery(run: () => void, message: string): void {
  try {
    run();
  } catch (error) {
    expect(error).toMatchObject({
      name: "WayboundError",
      code: "INVALID_QUERY",
      message,
    });
    return;
  }

  throw new Error("Expected query validation to throw.");
}

describe("query validation", () => {
  it("requires at least two route coordinates", () => {
    expectInvalidQuery(
      () =>
        validateRouteQuery({
          coordinates: [[5.12, 52.09]],
          profile: "hike",
        }),
      "RouteQuery requires at least 2 coordinates.",
    );
  });

  it("rejects invalid longitude and latitude values", () => {
    expectInvalidQuery(
      () =>
        validateRouteQuery({
          coordinates: [
            [181, 52.09],
            [5.11, 52.08],
          ],
          profile: "car",
        }),
      "RouteQuery coordinate at index 0 has an invalid longitude.",
    );

    expectInvalidQuery(
      () =>
        validateMatrixQuery({
          coordinates: [[5.12, Number.NaN]],
          profile: "bike",
        }),
      "MatrixQuery coordinate at index 0 has an invalid latitude.",
    );
  });

  it("requires at least one nearest coordinate and a positive finite radius", () => {
    expectInvalidQuery(
      () =>
        validateNearestQuery({
          coordinates: [],
          profile: "hike",
        }),
      "NearestQuery requires at least 1 coordinate.",
    );

    expectInvalidQuery(
      () =>
        validateNearestQuery({
          coordinates: [[5.12, 52.09]],
          profile: "hike",
          options: { radius: 0 },
        }),
      "NearestQuery radius must be a finite number greater than 0.",
    );
  });

  it("requires at least one matrix coordinate", () => {
    expectInvalidQuery(
      () =>
        validateMatrixQuery({
          coordinates: [],
          profile: "car",
        }),
      "MatrixQuery requires at least 1 coordinate.",
    );
  });

  it("validates isochrone coordinates and ranges", () => {
    expectInvalidQuery(
      () =>
        validateIsochroneQuery({
          coordinate: [5.12, 91],
          profile: "bike",
          options: { rangeType: "time", ranges: [300] },
        }),
      "IsochroneQuery coordinate has an invalid latitude.",
    );

    expectInvalidQuery(
      () =>
        validateIsochroneQuery({
          coordinate: [5.12, 52.09],
          profile: "bike",
          options: { rangeType: "time", ranges: [] },
        }),
      "IsochroneQuery ranges must contain at least one value.",
    );

    expectInvalidQuery(
      () =>
        validateIsochroneQuery({
          coordinate: [5.12, 52.09],
          profile: "bike",
          options: { rangeType: "distance", ranges: [500, -1] },
        }),
      "IsochroneQuery range at index 1 must be a finite number greater than 0.",
    );
  });

  it("accepts valid queries", () => {
    expect(() =>
      validateRouteQuery({
        coordinates: [
          [5.12, 52.09],
          [5.11, 52.08],
        ],
        profile: "hike",
      }),
    ).not.toThrow();

    expect(() =>
      validateNearestQuery({
        coordinates: [[5.12, 52.09]],
        profile: "car",
        options: { radius: 250 },
      }),
    ).not.toThrow();

    expect(() =>
      validateMatrixQuery({
        coordinates: [[5.12, 52.09]],
        profile: "bike",
      }),
    ).not.toThrow();

    expect(() =>
      validateIsochroneQuery({
        coordinate: [5.12, 52.09],
        profile: "bike",
        options: { rangeType: "time", ranges: [300, 600] },
      }),
    ).not.toThrow();
  });
});
