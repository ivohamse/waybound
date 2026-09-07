import type { LineString, MultiPolygon, Polygon } from "geojson";
import {
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
import { WayboundError } from "../../errors";
import { HttpClient, type HttpClientOptions } from "../../http/client";
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
        typeof path.distance !== "number" ||
        typeof path.time !== "number" ||
        !geometry ||
        geometry.type !== "LineString" ||
        !Array.isArray(geometry.coordinates)
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
            typeof instruction.distance !== "number" ||
            typeof instruction.time !== "number" ||
            !Array.isArray(coordinate) ||
            coordinate.length < 2 ||
            typeof coordinate[0] !== "number" ||
            typeof coordinate[1] !== "number"
          ) {
            throw this.invalidResponse(
              "Routing instruction contains invalid maneuver data.",
            );
          }

          return {
            instruction: instruction.text,
            distanceMeters: instruction.distance,
            durationSeconds: instruction.time / 1000,
            coordinate: [coordinate[0], coordinate[1]] as Coordinate,
          };
        });
      }

      return {
        distanceMeters: path.distance,
        durationSeconds: path.time / 1000,
        geometry: geometry as LineString,
        weight: typeof path.weight === "number" ? path.weight : undefined,
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

    // Reverse geocoding is an approximation of road-network snapping. Requests
    // are intentionally executed sequentially to avoid a burst of API calls.
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
      const lat = hit?.point?.lat;
      const lng = hit?.point?.lng;

      if (hit && (typeof lat !== "number" || typeof lng !== "number")) {
        throw this.invalidResponse(
          "Reverse-geocoding hit is missing a valid point coordinate.",
        );
      }

      points.push({
        sourceIndex,
        inputCoordinate: query.coordinates[sourceIndex],
        snappedCoordinate:
          typeof lng === "number" && typeof lat === "number"
            ? [lng, lat]
            : null,
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

    if (
      !this.isNullableNumberMatrix(data.times) ||
      !this.isNullableNumberMatrix(data.distances)
    ) {
      throw this.invalidResponse(
        "Matrix response is missing valid times or distances.",
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

      const polygon = data.polygons[0];
      const geometry = polygon.geometry;

      if (
        !geometry ||
        (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
      ) {
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
