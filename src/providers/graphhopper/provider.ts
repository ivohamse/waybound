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
  RouteResult,
  Maneuver,
} from "#types";
import { GraphHopperRequestBuilder } from "./builder";
import { GraphHopperClient } from "./client";
import { GRAPHHOPPER_CAPABILITIES } from "./capabilities";

export class GraphHopperProvider implements RoutingProvider {
  readonly name = "GraphHopper";
  readonly capabilities = GRAPHHOPPER_CAPABILITIES;
  private builder: GraphHopperRequestBuilder;
  private client: GraphHopperClient;

  constructor(apiKey: string) {
    this.builder = new GraphHopperRequestBuilder(apiKey);
    this.client = new GraphHopperClient(this.name);
  }

  async getRoute(query: RouteQuery): Promise<RouteResponse> {
    const request = this.builder.buildRouteRequest(query);
    const data = await this.client.execute(request);

    const paths = data.paths;

    if (!paths || paths.length === 0)
      throw new Error("GraphHopper returned no routing paths for this query");

    return {
      provider: this.name,
      routes: paths.map((path: any) => {
        const coordinates = path.points?.coordinates;
        // Parse GraphHopper turn-by-turn naar onze Maneuver interface
        let maneuvers: Maneuver[] | undefined = undefined;
        if (path.instructions && path.instructions.length > 0) {
          maneuvers = path.instructions.map((inst: any) => {
            const coordIndex = inst.points_index ?? 0;
            const instCoord = coordinates?.[coordIndex];

            return {
              instruction: inst.text,
              distanceMeters: inst.distance,
              durationSeconds: inst.time / 1000, // ms naar seconden
              coordinate: instCoord as [number, number],
            };
          });
        }

        return {
          distanceMeters: path.distance,
          durationSeconds: path.time / 1000,
          geometry: path.points as LineString,
          weight: path.weight,
          maneuvers,
          waypointOrder: path.details?.waypoint_order || undefined,
        };
      }),
    };
  }

  async getNearest(query: NearestQuery): Promise<NearestResponse> {
    const request = this.builder.buildNearestRequest(query);
    const data = await this.client.execute(request);

    if (!data.hits || data.hits.length === 0) {
      throw new Error(
        "No snapped point found via GraphHopper near these coordinates.",
      );
    }

    const matchedPoint = data.hits[0];

    return {
      provider: this.name,
      // Omdraaien naar de universele GeoJSON [Lng, Lat] indeling
      snappedCoordinate: [matchedPoint.point.lng, matchedPoint.point.lat],
      distanceMeters: 0,
      streetName: matchedPoint.name || matchedPoint.street || undefined,
    };
  }

  /**
   * NIEUW IN v0.2.0: Vraagt de Matrix data op bij GraphHopper en mapt deze naar de waybound-standaard.
   */
  async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    const request = this.builder.buildMatrixRequest(query);
    const data = await this.client.execute(request);

    // Let op: GraphHopper gebruikt 'times' in de response, waybound herformateert dit naar 'durations'
    if (!data.times || !data.distances) {
      throw new Error(
        `[waybound -> GraphHopper] Matrix API response missing times or distances.`,
      );
    }

    return {
      provider: this.name,
      durations: data.times, // Gemapt naar 'durations' voor uniformiteit met ORS!
      distances: data.distances,
    };
  }

  /**
   * Nieuw in v0.2.0
   */
  async getIsochrones(query: IsochroneQuery): Promise<IsochroneResponse> {
    const request = this.builder.buildIsochroneRequest(query);
    const data = await this.client.execute(request);

    const polygons = data.polygons;
    if (!polygons || polygons.length === 0) {
      throw new Error(
        `[waybound -> GraphHopper] Isochrone API returned no data.`,
      );
    }

    return {
      provider: this.name,
      isochrones: polygons.map((poly: any) => ({
        // GraphHopper levert een los GeoJSON Polygon object per ring
        value: poly.properties?.bucket ?? 0,
        geometry: poly.geometry as Polygon | MultiPolygon,
      })),
    };
  }
}
