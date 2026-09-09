import type { AuthenticationRequirement, ProfileType } from "#types";

export type CapabilitySemantics = "native" | "approximation";
export type CapabilityOption =
  | "language"
  | "elevation"
  | "instructions"
  | "radius"
  | "rangeType"
  | "ranges";

export interface FeatureCapability {
  readonly supported: boolean;
  readonly profiles: readonly ProfileType[];
  readonly options: readonly CapabilityOption[];
  readonly authentication: AuthenticationRequirement;
  readonly semantics?: CapabilitySemantics;
  readonly notes?: string;
}

export interface ProviderCapabilities {
  readonly directions: FeatureCapability;
  readonly nearest: FeatureCapability;
  readonly matrix: FeatureCapability;
  readonly isochrones: FeatureCapability;
}
