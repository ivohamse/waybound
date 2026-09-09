/**
 * Credential schemes understood by Waybound's public provider contract.
 * Individual providers advertise which schemes they accept for each feature.
 */
export type AuthenticationScheme = "api-key" | "bearer-token";

export interface ApiKeyAuthentication {
  readonly type: "api-key";
  readonly value: string;
}

export interface BearerTokenAuthentication {
  readonly type: "bearer-token";
  readonly value: string;
}

export type ProviderAuthentication =
  | ApiKeyAuthentication
  | BearerTokenAuthentication;

export interface AuthenticationRequirement {
  /** Whether the feature can be invoked without a credential. */
  readonly required: boolean;
  /** Credential schemes accepted for this feature; empty when none are needed. */
  readonly schemes: readonly AuthenticationScheme[];
}
