import type { LineString, MultiPolygon, Polygon } from "geojson";
import type {
  RoutingProvider,
  RouteQuery,
  RouteResponse,
  NearestQuery,
  NearestResponse,
  NearestResult,
  IsochroneQuery,
  IsochroneResponse,
  IsochroneResult,
  MatrixQuery,
  MatrixResponse,
  Maneuver,
  Coordinate,
} from "#types";
import { WayboundError } from "#core";
import { HttpClient, type HttpClientOptions } from "#http";
import {
  isCoordinate,
  isLineString,
  isNullableNumberMatrix,
  isPolygonGeometry,
} from "../validation";
import { GraphHopperRequestBuilder } from "./builder";
import { GRAPHHOPPER_CAPABILITIES } from "./capabilities";
import type {
  GraphHopperGeocodeResponse,
  GraphHopperIsochroneResponse,
  GraphHopperMatrixResponse,
  GraphHopperRouteResponse,
} from "./api-types";

export class GraphHopperProvider implements RoutingProvider {
  readonly name = "GraphHopper";
  readonly capabilities = GRAPHHOPPER_CAPABILITIES;
  private builder: GraphHopperRequestBuilder;
  private client: HttpClient;

  constructor(apiKey: string, httpOptions?: HttpClientOptions) {
    this.builder = new GraphHopperRequestBuilder(apiKey);
    this.client = new HttpClient(this.name, httpOptions);
  }

  private invalidResponse(message: string): WayboundError {
    return new WayboundError(
      "INVALID_RESPONSE",
      `[waybound -> GraphHopper] ${message}`,
      { provider: this.name },
    );
  }

  async getRoute(query: RouteQuery): Promise<RouteResponse> {
    const request = this.builder.buildRouteRequest(query);
    const data = await this.client.execute<GraphHopperRouteResponse>(request);
    const paths = data.paths;

    if (!Array.isArray(paths) || paths.length === 0) {
      throw this.invalidResponse("Routing response contains no paths.");
    }

    const routes = paths.map((path) => {
      const geometry = path.points;

      if (
        !Number.isFinite(path.distance) ||
        !Number.isFinite(path.time) ||
        !isLineString(geometry)
      ) {
        throw this.invalidResponse(
          "Routing path is missing required distance, time or geometry fields.",
        );
      }

      let maneuvers: Maneuver[] | undefined;

      if (Array.isArray(path.instructions)) {
        maneuvers = path.instructions.map((instruction) => {
          const coordinateIndex = instruction.interval?.[0];
          const coordinate =
            typeof coordinateIndex === "number"
              ? geometry.coordinates[coordinateIndex]
              : undefined;

          if (
            typeof instruction.text !== "string" ||
            !Number.isFinite(instruction.distance) ||
            !Number.isFinite(instruction.time) ||
            !isCoordinate(coordinate)
          ) {
            throw this.invalidResponse(
              "Routing instruction contains invalid maneuver data.",
            );
          }

          return {
            instruction: instruction.text,
            distanceMeters: instruction.distance!,
            durationSeconds: instruction.time! / 1000,
            coordinate: [coordinate[0], coordinate[1]] as Coordinate,
          };
        });
      }

      return {
        distanceMeters: path.distance!,
        durationSeconds: path.time! / 1000,
        geometry: geometry as LineString,
        weight:
          typeof path.weight === "number" && Number.isFinite(path.weight)
            ? path.weight
            : undefined,
        maneuvers,
        waypointOrder: Array.isArray(path.points_order)
          ? path.points_order
          : undefined,
      };
    });

    return { provider: this.name, routes };
  }

  async getNearest(query: NearestQuery): Promise<NearestResponse> {
    const requests = this.builder.buildNearestRequests(query);
    const points: NearestResult[] = [];

    for (let sourceIndex = 0; sourceIndex < requests.length; sourceIndex++) {
      const data = await this.client.execute<GraphHopperGeocodeResponse>(
        requests[sourceIndex],
      );

      if (!Array.isArray(data.hits)) {
        throw this.invalidResponse(
          "Reverse-geocoding response is missing its hits array.",
        );
      }

      const hit = data.hits[0];
      let snappedCoordinate: Coordinate | null = null;

      if (hit) {
        const candidate = [hit.point?.lng, hit.point?.lat];

        if (!isCoordinate(candidate)) {
          throw this.invalidResponse(
            "Reverse-geocoding hit is missing a valid point coordinate.",
          );
        }

        snappedCoordinate = candidate;
      }

      points.push({
        sourceIndex,
        inputCoordinate: query.coordinates[sourceIndex],
        snappedCoordinate,
        distanceMeters: null,
        streetName:
          typeof hit?.name === "string"
            ? hit.name
            : typeof hit?.street === "string"
              ? hit.street
              : undefined,
      });
    }

    return { provider: this.name, points };
  }

  async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    const request = this.builder.buildMatrixRequest(query);
    const data = await this.client.execute<GraphHopperMatrixResponse>(request);
    const size = query.coordinates.length;

    if (
      !isNullableNumberMatrix(data.times, size) ||
      !isNullableNumberMatrix(data.distances, size)
    ) {
      throw this.invalidResponse(
        "Matrix response is missing a valid square times or distances matrix.",
      );
    }

    return {
      provider: this.name,
      durations: data.times,
      distances: data.distances,
    };
  }

  async getIsochrones(query: IsochroneQuery): Promise<IsochroneResponse> {
    const requests = this.builder.buildIsochroneRequests(query);
    const isochrones: IsochroneResult[] = [];

    for (const { request, value } of requests) {
      const data = await this.client.execute<GraphHopperIsochroneResponse>(
        request,
      );

      if (!Array.isArray(data.polygons) || data.polygons.length === 0) {
        throw this.invalidResponse("Isochrone response contains no polygons.");
      }

      const geometry = data.polygons[0].geometry;

      if (!isPolygonGeometry(geometry)) {
        throw this.invalidResponse(
          "Isochrone response contains invalid polygon geometry.",
        );
      }

      isochrones.push({
        value,
        geometry: geometry as Polygon | MultiPolygon,
      });
    }

    return { provider: this.name, isochrones };
  }
}
