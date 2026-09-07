import type { ProfileType } from "#types";

export type CapabilitySemantics = "native" | "approximation";

export interface FeatureCapability {
  readonly supported: boolean;
  readonly profiles: readonly ProfileType[];
  readonly semantics?: CapabilitySemantics;
  readonly notes?: string;
}

export interface ProviderCapabilities {
  readonly directions: FeatureCapability;
  readonly nearest: FeatureCapability;
  readonly matrix: FeatureCapability;
  readonly isochrones: FeatureCapability;
}
