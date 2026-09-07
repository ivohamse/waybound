import type { LineString, MultiPolygon, Polygon } from "geojson";
import {
  RoutingProvider,
  RouteQuery,
  RouteResponse,
  NearestQuery,
  NearestResponse,
  IsochroneQuery,
  IsochroneResponse,
  MatrixQuery,
  MatrixResponse,
  Maneuver,
  Coordinate,
} from "#types";
import { WayboundError } from "../../errors";
import { HttpClient, type HttpClientOptions } from "../../http/client";
import { OrsRequestBuilder } from "./builder";
import { ORS_CAPABILITIES } from "./capabilities";
import type {
  OrsDirectionsResponse,
  OrsIsochroneResponse,
  OrsMatrixResponse,
  OrsSnapResponse,
} from "./api-types";

export class OpenRouteServiceProvider implements RoutingProvider {
  readonly name = "OpenRouteService";
  readonly capabilities = ORS_CAPABILITIES;
  private builder: OrsRequestBuilder;
  private client: HttpClient;

  constructor(apiKey: string, httpOptions?: HttpClientOptions) {
    this.builder = new OrsRequestBuilder(apiKey);
    this.client = new HttpClient(this.name, httpOptions);
  }

  private invalidResponse(message: string): WayboundError {
    return new WayboundError("INVALID_RESPONSE", `[waybound -> ORS] ${message}`, {
      provider: this.name,
    });
  }

  async getRoute(query: RouteQuery): Promise<RouteResponse> {
    const request = this.builder.buildRouteRequest(query);
    const data = await this.client.execute<OrsDirectionsResponse>(request);
    const features = data.features;

    if (!Array.isArray(features) || features.length === 0) {
      throw this.invalidResponse("Directions response contains no route features.");
    }

    const routes = features.map((feature) => {
      const summary = feature.properties?.summary;
      const geometry = feature.geometry;

      if (
        !summary ||
        typeof summary.distance !== "number" ||
        typeof summary.duration !== "number" ||
        !geometry ||
        geometry.type !== "LineString" ||
        !Array.isArray(geometry.coordinates)
      ) {
        throw this.invalidResponse(
          "Directions feature is missing required summary or geometry fields.",
        );
      }

      let maneuvers: Maneuver[] | undefined;
      const segments = feature.properties?.segments;

      if (Array.isArray(segments) && query.options?.instructions !== false) {
        maneuvers = [];

        for (const segment of segments) {
          if (!Array.isArray(segment.steps)) continue;

          for (const step of segment.steps) {
            const coordIndex = step.way_points?.[0];
            const coordinate =
              typeof coordIndex === "number"
                ? geometry.coordinates[coordIndex]
                : undefined;

            if (
              typeof step.instruction !== "string" ||
              typeof step.distance !== "number" ||
              typeof step.duration !== "number" ||
              !Array.isArray(coordinate) ||
              coordinate.length < 2 ||
              typeof coordinate[0] !== "number" ||
              typeof coordinate[1] !== "number"
            ) {
              throw this.invalidResponse(
                "Directions instruction contains invalid maneuver data.",
              );
            }

            maneuvers.push({
              instruction: step.instruction,
              distanceMeters: step.distance,
              durationSeconds: step.duration,
              coordinate: [coordinate[0], coordinate[1]],
            });
          }
        }
      }

      return {
        distanceMeters: summary.distance,
        durationSeconds: summary.duration,
        geometry: geometry as LineString,
        weight:
          typeof summary.weight === "number" ? summary.weight : undefined,
        maneuvers,
        waypointOrder: feature.properties?.waypoint_order,
      };
    });

    return { provider: this.name, routes };
  }

  async getNearest(query: NearestQuery): Promise<NearestResponse> {
    const request = this.builder.buildNearestRequest(query);
    const data = await this.client.execute<OrsSnapResponse>(request);

    if (!Array.isArray(data.features)) {
      throw this.invalidResponse("Snap response is missing its features array.");
    }

    const points = query.coordinates.map((inputCoordinate, sourceIndex) => ({
      sourceIndex,
      inputCoordinate,
      snappedCoordinate: null as Coordinate | null,
      distanceMeters: null as number | null,
      streetName: undefined as string | undefined,
    }));

    for (const feature of data.features) {
      const sourceIndex = feature.properties?.source_id;
      const geometry = feature.geometry;
      const coordinates = geometry?.coordinates;

      if (
        typeof sourceIndex !== "number" ||
        !Number.isInteger(sourceIndex) ||
        sourceIndex < 0 ||
        sourceIndex >= points.length ||
        !geometry ||
        geometry.type !== "Point" ||
        !Array.isArray(coordinates) ||
        coordinates.length < 2 ||
        typeof coordinates[0] !== "number" ||
        typeof coordinates[1] !== "number"
      ) {
        throw this.invalidResponse(
          "Snap feature cannot be matched to a valid input coordinate.",
        );
      }

      const distance = feature.properties?.distance;
      if (distance !== undefined && typeof distance !== "number") {
        throw this.invalidResponse("Snap feature contains an invalid distance.");
      }

      points[sourceIndex] = {
        sourceIndex,
        inputCoordinate: query.coordinates[sourceIndex],
        snappedCoordinate: [coordinates[0], coordinates[1]],
        distanceMeters: distance ?? null,
        streetName:
          typeof feature.properties?.name === "string"
            ? feature.properties.name
            : undefined,
      };
    }

    return { provider: this.name, points };
  }

  async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    const request = this.builder.buildMatrixRequest(query);
    const data = await this.client.execute<OrsMatrixResponse>(request);

    if (
      !this.isNullableNumberMatrix(data.durations) ||
      !this.isNullableNumberMatrix(data.distances)
    ) {
      throw this.invalidResponse(
        "Matrix response is missing valid durations or distances.",
      );
    }

    return {
      provider: this.name,
      durations: data.durations,
      distances: data.distances,
    };
  }

  async getIsochrones(query: IsochroneQuery): Promise<IsochroneResponse> {
    const request = this.builder.buildIsochroneRequest(query);
    const data = await this.client.execute<OrsIsochroneResponse>(request);

    if (!Array.isArray(data.features) || data.features.length === 0) {
      throw this.invalidResponse("Isochrone response contains no polygons.");
    }

    const isochrones = data.features.map((feature) => {
      const value = feature.properties?.value;
      const geometry = feature.geometry;

      if (
        typeof value !== "number" ||
        !geometry ||
        (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
      ) {
        throw this.invalidResponse(
          "Isochrone feature is missing a valid value or polygon geometry.",
        );
      }

      return {
        value,
        geometry: geometry as Polygon | MultiPolygon,
      };
    });

    return { provider: this.name, isochrones };
  }

  private isNullableNumberMatrix(
    value: unknown,
  ): value is (number | null)[][] {
    return (
      Array.isArray(value) &&
      value.every(
        (row) =>
          Array.isArray(row) &&
          row.every((cell) => cell === null || typeof cell === "number"),
      )
    );
  }
}
