import type { ProviderCapabilities } from "#core";
import type { AuthenticationScheme } from "./authentication";
import type { RouteQuery, RouteResponse } from "./directions";
import type { IsochroneQuery, IsochroneResponse } from "./isochrones";
import type { MatrixQuery, MatrixResponse } from "./matrix";
import type { NearestQuery, NearestResponse } from "./nearest";

export interface RoutingProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  /** Schemes currently configured on this provider instance; credentials stay private. */
  readonly authenticationSchemes: readonly AuthenticationScheme[];
  getRoute(query: RouteQuery): Promise<RouteResponse>;
  getNearest(query: NearestQuery): Promise<NearestResponse>;
  getMatrix(query: MatrixQuery): Promise<MatrixResponse>;
  getIsochrones(query: IsochroneQuery): Promise<IsochroneResponse>;
}
