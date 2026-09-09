import type { Coordinate, ProfileType } from "#types";
import type { CapabilityFeature } from "./router";

export type CapabilityAvailability = "available" | "unavailable" | "unknown";

export type AvailabilityReason =
  | "plan-restricted"
  | "access-restricted"
  | "credentials-rejected"
  | "rate-limited"
  | "timeout"
  | "network-error"
  | "provider-error"
  | null;

export interface ObservedCapabilityAvailability {
  readonly feature: CapabilityFeature;
  readonly profile: ProfileType;
  readonly availability: CapabilityAvailability;
  readonly reason: AvailabilityReason;
  readonly httpStatus?: number;
  readonly observedAt: Date;
  readonly expiresAt: Date;
}

export interface CapabilityProbeTarget {
  readonly feature: CapabilityFeature;
  readonly profile: ProfileType;
}

export interface CapabilityProbeOptions {
  /** Two nearby, routable coordinates for the configured endpoint. */
  readonly coordinates: readonly [Coordinate, Coordinate];
  /** Defaults to every advertised feature for every advertised profile. */
  readonly targets?: readonly CapabilityProbeTarget[];
  /** Ignore still-valid observations and execute the probe again. */
  readonly force?: boolean;
}

export const CAPABILITY_AVAILABILITY_TTL_MS = 60 * 60 * 1_000;
