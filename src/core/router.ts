import type {
  RoutingProvider,
  RouteQuery,
  RouteResponse,
  NearestQuery,
  NearestResponse,
  MatrixQuery,
  MatrixResponse,
  IsochroneQuery,
  IsochroneResponse,
  ProfileType,
} from "#types";
import type { HttpClientOptions } from "#http";
import { GraphHopperProvider, OpenRouteServiceProvider } from "#providers";
import type { CapabilityOption, ProviderCapabilities } from "./capabilities";
import { WayboundError } from "./errors";

export type ProviderType = "ors" | "graphhopper";
export type CapabilityFeature = keyof ProviderCapabilities;

export interface RouterConfig {
  provider: ProviderType;
  apiKey: string;
  http?: HttpClientOptions;
}

export class Router {
  private activeProvider: RoutingProvider;

  constructor(config: RouterConfig) {
    const providerKey = config.provider.toLowerCase();

    if (providerKey === "ors") {
      this.activeProvider = new OpenRouteServiceProvider(
        config.apiKey,
        config.http,
      );
    } else if (providerKey === "graphhopper") {
      this.activeProvider = new GraphHopperProvider(config.apiKey, config.http);
    } else {
      throw new WayboundError(
        "UNSUPPORTED_PROVIDER",
        `Unsupported provider "${config.provider}" inside waybound.`,
      );
    }
  }

  private assertCapability(
    feature: CapabilityFeature,
    profile: ProfileType,
    options?: object,
  ): void {
    const capability = this.activeProvider.capabilities[feature];

    if (!capability.supported) {
      throw new WayboundError(
        "UNSUPPORTED_FEATURE",
        `[waybound -> ${this.activeProvider.name}] ${feature} is not supported by this provider.`,
        { provider: this.activeProvider.name },
      );
    }

    if (!capability.profiles.includes(profile)) {
      throw new WayboundError(
        "UNSUPPORTED_PROFILE",
        `[waybound -> ${this.activeProvider.name}] Profile "${profile}" is not supported for ${feature}.`,
        { provider: this.activeProvider.name },
      );
    }

    if (options) {
      const unsupportedOption = Object.keys(options).find(
        (option) =>
          !capability.options.includes(option as CapabilityOption),
      );

      if (unsupportedOption) {
        throw new WayboundError(
          "UNSUPPORTED_OPTION",
          `[waybound -> ${this.activeProvider.name}] Option "${unsupportedOption}" is not supported for ${feature}.`,
          { provider: this.activeProvider.name },
        );
      }
    }
  }

  private toProviderError(error: unknown, operation: string): WayboundError {
    if (error instanceof WayboundError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);

    return new WayboundError(
      "PROVIDER_ERROR",
      `[waybound -> ${this.activeProvider.name}] ${operation} failed: ${message}`,
      {
        provider: this.activeProvider.name,
        cause: error,
      },
    );
  }

  public async getRoute(query: RouteQuery): Promise<RouteResponse> {
    this.assertCapability("directions", query.profile, query.options);

    try {
      return await this.activeProvider.getRoute(query);
    } catch (error: unknown) {
      throw this.toProviderError(error, "getRoute");
    }
  }

  public async getNearest(query: NearestQuery): Promise<NearestResponse> {
    this.assertCapability("nearest", query.profile, query.options);

    try {
      return await this.activeProvider.getNearest(query);
    } catch (error: unknown) {
      throw this.toProviderError(error, "getNearest");
    }
  }

  public async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    this.assertCapability("matrix", query.profile, query.options);

    try {
      return await this.activeProvider.getMatrix(query);
    } catch (error: unknown) {
      throw this.toProviderError(error, "getMatrix");
    }
  }

  public async getIsochrones(
    query: IsochroneQuery,
  ): Promise<IsochroneResponse> {
    this.assertCapability("isochrones", query.profile, query.options);

    try {
      return await this.activeProvider.getIsochrones(query);
    } catch (error: unknown) {
      throw this.toProviderError(error, "getIsochrones");
    }
  }

  public get providerName(): string {
    return this.activeProvider.name;
  }

  public get capabilities(): ProviderCapabilities {
    return this.activeProvider.capabilities;
  }
}
