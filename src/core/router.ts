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
import type { CapabilityOption, ProviderCapabilities } from "./capabilities";
import { WayboundError } from "./errors";
import {
  validateIsochroneQuery,
  validateMatrixQuery,
  validateNearestQuery,
  validateRouteQuery,
} from "./query-validation";

export type CapabilityFeature = keyof ProviderCapabilities;

export interface RouterConfig {
  provider: RoutingProvider;
}

export class Router {
  private readonly activeProvider: RoutingProvider;

  constructor(config: RouterConfig) {
    this.activeProvider = config.provider;
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
        (option) => !capability.options.includes(option as CapabilityOption),
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
    validateRouteQuery(query);
    this.assertCapability("directions", query.profile, query.options);

    try {
      return await this.activeProvider.getRoute(query);
    } catch (error: unknown) {
      throw this.toProviderError(error, "getRoute");
    }
  }

  public async getNearest(query: NearestQuery): Promise<NearestResponse> {
    validateNearestQuery(query);
    this.assertCapability("nearest", query.profile, query.options);

    try {
      return await this.activeProvider.getNearest(query);
    } catch (error: unknown) {
      throw this.toProviderError(error, "getNearest");
    }
  }

  public async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    validateMatrixQuery(query);
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
    validateIsochroneQuery(query);
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
