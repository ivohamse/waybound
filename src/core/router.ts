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
import {
  CAPABILITY_AVAILABILITY_TTL_MS,
  type AvailabilityReason,
  type CapabilityProbeOptions,
  type CapabilityProbeTarget,
  type ObservedCapabilityAvailability,
} from "./availability";
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
  private readonly observedAvailability = new Map<string, ObservedCapabilityAvailability>();

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

    const authentication = capability.authentication;
    const matchingScheme = authentication.schemes.some((scheme) =>
      this.activeProvider.authenticationSchemes.includes(scheme),
    );
    if (authentication.required && !matchingScheme) {
      const configured = this.activeProvider.authenticationSchemes;
      const code = configured.length === 0
        ? "MISSING_CREDENTIAL"
        : "UNSUPPORTED_AUTHENTICATION";
      const expected = authentication.schemes.join(" or ");
      const received = configured.join(", ");
      throw new WayboundError(
        code,
        code === "MISSING_CREDENTIAL"
          ? `[waybound -> ${this.activeProvider.name}] ${feature} requires ${expected} authentication.`
          : `[waybound -> ${this.activeProvider.name}] ${feature} requires ${expected} authentication, but this provider is configured with ${received}.`,
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

  private availabilityKey(feature: CapabilityFeature, profile: ProfileType): string {
    return `${feature}:${profile}`;
  }

  private observe(feature: CapabilityFeature, profile: ProfileType, availability: ObservedCapabilityAvailability["availability"], reason: AvailabilityReason, httpStatus?: number): ObservedCapabilityAvailability {
    const observedAt = new Date();
    const observation = { feature, profile, availability, reason, httpStatus, observedAt, expiresAt: new Date(observedAt.getTime() + CAPABILITY_AVAILABILITY_TTL_MS) };
    this.observedAvailability.set(this.availabilityKey(feature, profile), observation);
    return observation;
  }

  private observeFailure(feature: CapabilityFeature, profile: ProfileType, error: WayboundError): ObservedCapabilityAvailability {
    if (error.status === 403) return this.observe(feature, profile, "unavailable", "access-restricted", error.status);
    const message = error.providerMessage?.toLowerCase() ?? "";
    const isKnownPlanRestriction = this.activeProvider.name === "GraphHopper"
      && feature === "isochrones"
      && error.status === 400
      && /(?:premium|business|subscription|plan|account|credit)/.test(message);
    if (isKnownPlanRestriction) return this.observe(feature, profile, "unavailable", "plan-restricted", error.status);
    const reasons: Partial<Record<WayboundError["code"], AvailabilityReason>> = {
      RATE_LIMITED: "rate-limited", REQUEST_TIMEOUT: "timeout", NETWORK_ERROR: "network-error",
      PROVIDER_ERROR: "provider-error", MISSING_CREDENTIAL: "credentials-rejected",
    };
    return this.observe(feature, profile, "unknown", reasons[error.code] ?? "provider-error", error.status);
  }

  /** Returns a cached observation without making a provider request. */
  public getObservedAvailability(feature: CapabilityFeature, profile: ProfileType): ObservedCapabilityAvailability | undefined {
    const observation = this.observedAvailability.get(this.availabilityKey(feature, profile));
    if (!observation || observation.expiresAt.getTime() <= Date.now()) {
      if (observation) this.observedAvailability.delete(this.availabilityKey(feature, profile));
      return undefined;
    }
    return observation;
  }

  public async getRoute(query: RouteQuery): Promise<RouteResponse> {
    validateRouteQuery(query);
    this.assertCapability("directions", query.profile, query.options);

    try {
      const response = await this.activeProvider.getRoute(query);
      this.observe("directions", query.profile, "available", null);
      return response;
    } catch (error: unknown) {
      const normalized = this.toProviderError(error, "getRoute");
      this.observeFailure("directions", query.profile, normalized);
      throw normalized;
    }
  }

  public async getNearest(query: NearestQuery): Promise<NearestResponse> {
    validateNearestQuery(query);
    this.assertCapability("nearest", query.profile, query.options);

    try {
      const response = await this.activeProvider.getNearest(query);
      this.observe("nearest", query.profile, "available", null);
      return response;
    } catch (error: unknown) {
      const normalized = this.toProviderError(error, "getNearest");
      this.observeFailure("nearest", query.profile, normalized);
      throw normalized;
    }
  }

  public async getMatrix(query: MatrixQuery): Promise<MatrixResponse> {
    validateMatrixQuery(query);
    this.assertCapability("matrix", query.profile, query.options);

    try {
      const response = await this.activeProvider.getMatrix(query);
      this.observe("matrix", query.profile, "available", null);
      return response;
    } catch (error: unknown) {
      const normalized = this.toProviderError(error, "getMatrix");
      this.observeFailure("matrix", query.profile, normalized);
      throw normalized;
    }
  }

  public async getIsochrones(
    query: IsochroneQuery,
  ): Promise<IsochroneResponse> {
    validateIsochroneQuery(query);
    this.assertCapability("isochrones", query.profile, query.options);

    try {
      const response = await this.activeProvider.getIsochrones(query);
      this.observe("isochrones", query.profile, "available", null);
      return response;
    } catch (error: unknown) {
      const normalized = this.toProviderError(error, "getIsochrones");
      this.observeFailure("isochrones", query.profile, normalized);
      throw normalized;
    }
  }

  public async probeCapabilities(options: CapabilityProbeOptions): Promise<readonly ObservedCapabilityAvailability[]> {
    const [first, second] = options.coordinates;
    const targets = options.targets ?? (Object.entries(this.capabilities) as [CapabilityFeature, ProviderCapabilities[CapabilityFeature]][])
      .flatMap(([feature, capability]) => capability.supported ? capability.profiles.map((profile) => ({ feature, profile })) : []);
    const results: ObservedCapabilityAvailability[] = [];
    for (const target of targets) {
      const cached = !options.force && this.getObservedAvailability(target.feature, target.profile);
      if (cached) { results.push(cached); continue; }
      try {
        await this.runProbe(target, first, second);
      } catch {
        // Normal calls record the normalized failure before rethrowing.
      }
      const result = this.getObservedAvailability(target.feature, target.profile);
      if (result) results.push(result);
    }
    return results;
  }

  private async runProbe(target: CapabilityProbeTarget, first: import("#types").Coordinate, second: import("#types").Coordinate): Promise<void> {
    if (target.feature === "directions") await this.getRoute({ coordinates: [first, second], profile: target.profile });
    else if (target.feature === "nearest") await this.getNearest({ coordinates: [first], profile: target.profile });
    else if (target.feature === "matrix") await this.getMatrix({ coordinates: [first, second], profile: target.profile });
    else await this.getIsochrones({ coordinate: first, profile: target.profile, options: { rangeType: "time", ranges: [300] } });
  }

  public get providerName(): string {
    return this.activeProvider.name;
  }

  public get capabilities(): ProviderCapabilities {
    return this.activeProvider.capabilities;
  }
}
