import type { ProfileType } from "#types";

export type CapabilitySemantics = "native" | "approximation";

export interface FeatureCapability {
  supported: boolean;
  profiles: readonly ProfileType[];
  semantics?: CapabilitySemantics;
  notes?: string;
}

export interface ProviderCapabilities {
  directions: FeatureCapability;
  nearest: FeatureCapability;
  matrix: FeatureCapability;
  isochrones: FeatureCapability;
}
