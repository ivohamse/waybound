import type { ProviderCapabilities } from "#core";
import type { RouteQuery, RouteResponse } from "./directions";
import type { IsochroneQuery, IsochroneResponse } from "./isochrones";
import type { MatrixQuery, MatrixResponse } from "./matrix";
import type { NearestQuery, NearestResponse } from "./nearest";

export interface RoutingProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  getRoute(query: RouteQuery): Promise<RouteResponse>;
  getNearest(query: NearestQuery): Promise<NearestResponse>;
  getMatrix(query: MatrixQuery): Promise<MatrixResponse>;
  getIsochrones(query: IsochroneQuery): Promise<IsochroneResponse>;
}
