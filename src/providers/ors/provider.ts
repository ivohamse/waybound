import type { LineString, MultiPolygon, Polygon } from "geojson";
import type {
  RoutingProvider,
  AuthenticationScheme,
  RouteQuery,
  RouteResponse,
  NearestQuery,
  NearestResponse,
  NearestResult,
  IsochroneQuery,
  IsochroneResponse,
  MatrixQuery,
  MatrixResponse,
  Maneuver,
} from "#types";
import { WayboundError } from "#core";
import { HttpClient } from "#http";
import {
  isCoordinate,
  isLineString,
  isNullableNumberMatrix,
  isPolygonGeometry,
} from "../validation";
import { OrsRequestBuilder } from "./builder";
import type { OpenRouteServiceProviderOptions } from "./config";
import { ORS_CAPABILITIES } from "./capabilities";
import type {
  OrsDirectionsResponse,
  OrsIsochroneResponse,
  OrsMatrixResponse,
  OrsSnapResponse,
} from "./api-types";

export class OpenRouteServiceProvider implements RoutingProvider {
  readonly name = "OpenRouteService";
  readonly authenticationSchemes: readonly AuthenticationScheme[];
  readonly capabilities = ORS_CAPABILITIES;
  private builder: OrsRequestBuilder;
  private client: HttpClient;

  constructor(options: OpenRouteServiceProviderOptions = {}) {
    const authentication = options.authentication;
    this.authenticationSchemes = authentication ? [authentication.type] : [];
    this.builder = new OrsRequestBuilder(
      authentication?.type === "api-key" ? authentication.value : undefined,
    );
    this.client = new HttpClient(this.name, options.http);
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
        !Number.isFinite(summary.distance) ||
        !Number.isFinite(summary.duration) ||
        !isLineString(geometry)
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
              !Number.isFinite(step.distance) ||
              !Number.isFinite(step.duration) ||
              !isCoordinate(coordinate)
            ) {
              throw this.invalidResponse(
                "Directions instruction contains invalid maneuver data.",
              );
            }

            maneuvers.push({
              instruction: step.instruction,
              distance: step.distance!,
              duration: step.duration!,
              coordinate: [coordinate[0], coordinate[1]],
            });
          }
        }
      }

      return {
        distance: summary.distance!,
        duration: summary.duration!,
        geometry: geometry as LineString,
        maneuvers,
      };
    });

    return { provider: this.name, routes };
  }

  async getNearest(query: NearestQuery): Promise<NearestResponse> {
    const request = this.builder.buildNearestRequest(query);
    const data = await this.client.execute<OrsSnapResponse>(request);
    const locations = data.locations;

    if (
      !Array.isArray(locations) ||
      locations.length !== query.coordinates.length
    ) {
      throw this.invalidResponse(
        "Snap response does not contain one location result per input coordinate.",
      );
    }

    const points: NearestResult[] = locations.map((location, sourceIndex) => {
      const inputCoordinate = query.coordinates[sourceIndex];

      if (location === null) {
        return {
          sourceIndex,
          inputCoordinate,
          nearestPoint: null,
          distance: null,
        };
      }

      if (!isCoordinate(location.location)) {
        throw this.invalidResponse(
          "Snap result is missing a valid snapped coordinate.",
        );
      }

      if (
        location.snapped_distance !== undefined &&
        !Number.isFinite(location.snapped_distance)
      ) {
        throw this.invalidResponse("Snap result contains an invalid distance.");
      }

      if (location.name !== undefined && typeof location.name !== "string") {
        throw this.invalidResponse("Snap result contains an invalid street name.");
      }

      return {
        sourceIndex,
        inputCoordinate,
        nearestPoint: {
          type: "Point",
          coordinates: [location.location[0], location.location[1]],
        },
        distance: location.snapped_distance ?? null,
        streetName: location.name,
      };
    });

    return { provider: this.name, points };
  }

  async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    const request = this.builder.buildMatrixRequest(query);
    const data = await this.client.execute<OrsMatrixResponse>(request);
    const size = query.coordinates.length;

    if (
      !isNullableNumberMatrix(data.durations, size) ||
      !isNullableNumberMatrix(data.distances, size)
    ) {
      throw this.invalidResponse(
        "Matrix response is missing a valid square durations or distances matrix.",
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

      if (!Number.isFinite(value) || !isPolygonGeometry(geometry)) {
        throw this.invalidResponse(
          "Isochrone feature is missing a valid value or polygon geometry.",
        );
      }

      const normalizedGeometry = geometry as Polygon | MultiPolygon;

      return query.options.rangeType === "time"
        ? { duration: value!, geometry: normalizedGeometry }
        : { distance: value!, geometry: normalizedGeometry };
    });

    return { provider: this.name, isochrones };
  }
}
