import {
  RoutingProvider,
  RouteQuery,
  RouteResponse,
  NearestQuery,
  NearestResponse,
  MatrixQuery,
  MatrixResponse,
  IsochroneQuery,
  IsochroneResponse,
} from "#types";
import { OpenRouteServiceProvider } from "#providers/ors";
import { GraphHopperProvider } from "#providers/graphhopper";

export type ProviderType = "ors" | "graphhopper";

export interface RouterConfig {
  provider: ProviderType;
  apiKey: string;
}

export class Router {
  private activeProvider: RoutingProvider;

  constructor(config: RouterConfig) {
    const providerKey = config.provider.toLowerCase();

    if (providerKey === "ors") {
      this.activeProvider = new OpenRouteServiceProvider(config.apiKey);
    } else if (providerKey === "graphhopper") {
      this.activeProvider = new GraphHopperProvider(config.apiKey);
    } else {
      throw new Error(
        `Unsupported provider "${config.provider}" inside waybound.`,
      );
    }
  }

  public async getRoute(query: RouteQuery): Promise<RouteResponse> {
    return this.activeProvider.getRoute(query);
  }

  public async getNearest(query: NearestQuery): Promise<NearestResponse> {
    return this.activeProvider.getNearest(query);
  }

  /**
   * NIEUW IN v0.2.0: Bereken een tweedimensionale matrix van afstanden en reistijden
   * tussen alle meegegeven locaties.
   */
  public async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    try {
      return await this.activeProvider.getMatrix(query);
    } catch (error: any) {
      throw new Error(
        `[waybound -> ${this.activeProvider.name}] getMatrix failed: ${error.message}`,
      );
    }
  }

  /**
   * NIEUW IN v0.2.0: Genereer bereikbaarheidscirkels (GeoJSON Polygons) op basis
   * van een tijd- of afstandsbuffers vanaf een centraal startpunt.
   */
  public async getIsochrones(
    query: IsochroneQuery,
  ): Promise<IsochroneResponse> {
    try {
      return await this.activeProvider.getIsochrones(query);
    } catch (error: any) {
      throw new Error(
        `[waybound -> ${this.activeProvider.name}] getIsochrones failed: ${error.message}`,
      );
    }
  }

  public get providerName(): string {
    return this.activeProvider.name;
  }
}
