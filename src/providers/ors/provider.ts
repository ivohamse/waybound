// src/providers/ors.ts
import { LineString, MultiPolygon, Polygon } from "geojson";
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
} from "#types";

import { OrsRequestBuilder } from "./builder";
import { OrsClient } from "./client";

export class OpenRouteServiceProvider implements RoutingProvider {
  readonly name = "OpenRouteService";
  private builder: OrsRequestBuilder;
  private client: OrsClient;

  constructor(apiKey: string) {
    this.builder = new OrsRequestBuilder(apiKey);
    this.client = new OrsClient(this.name);
  }

  async getRoute(query: RouteQuery): Promise<RouteResponse> {
    // A. Laat de builder het HTTP verzoek uittekenen
    const request = this.builder.buildRouteRequest(query);

    // B. Voer het verzoek uit via de client-laag
    const data = await this.client.execute(request);

    // C. Transformeer naar de universele GeoJSON response van waybound
    const features = data.features;

    if (!features || features.length === 0)
      throw new Error(
        "ORS returned an empty feature collection for this route query.",
      );

    return {
      provider: this.name,
      routes: features.map((feature: any) => {
        const summary = feature.properties?.summary;
        const segments = feature.properties?.segments;
        const coordinates = feature.geometry?.coordinates;

        if (!summary) {
          throw new Error(
            "ORS route feature is missing the required summary properties.",
          );
        }

        let maneuvers: Maneuver[] | undefined = undefined;
        if (
          segments &&
          segments.length > 0 &&
          query.options?.instructions !== false
        ) {
          maneuvers = [];
          for (const segment of segments) {
            if (segment.steps) {
              for (const step of segment.steps) {
                const coordIndex = step.way_points?.[0] ?? 0;
                const stepCoord = coordinates?.[coordIndex];

                maneuvers.push({
                  instruction: step.instruction,
                  distanceMeters: step.distance,
                  durationSeconds: step.duration,
                  coordinate: stepCoord as [number, number],
                });
              }
            }
          }
        }

        return {
          distanceMeters: summary.distance,
          durationSeconds: summary.duration,
          geometry: feature.geometry as LineString,
          weight: summary.weight || undefined,
          maneuvers,
          waypointOrder: feature.properties?.waypoint_order || undefined,
        };
      }),
    };
  }

  async getNearest(query: NearestQuery): Promise<NearestResponse> {
    const request = this.builder.buildNearestRequest(query);
    const data = await this.client.execute(request);

    const feature = data.features?.[0];
    if (!feature)
      throw new Error(
        "Could not find a routable path close to these coordinates via ORS.",
      );

    return {
      provider: this.name,
      snappedCoordinate: feature.geometry.coordinates as [number, number],
      distanceMeters: feature.properties.distance || 0,
      streetName: feature.properties.name || undefined,
    };
  }

  async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    const request = this.builder.buildMatrixRequest(query);
    const data = await this.client.execute(request);

    if (!data.durations || !data.distances) {
      throw new Error(
        `[waybound -> ORS] Matrix API response structure invalid. Missing durations or distances.`,
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
    const data = await this.client.execute(request);

    const features = data.features;
    if (!features || features.length === 0) {
      throw new Error(`[waybound -> ORS] Isochrone API returned no polygons.`);
    }

    return {
      provider: this.name,
      isochrones: features.map((feature: any) => ({
        value: feature.properties.value,
        geometry: feature.geometry as Polygon | MultiPolygon,
      })),
    };
  }
}
