import type { ProviderAuthentication } from "#types";
import type { HttpClientOptions } from "#http";

export interface OpenRouteServiceProviderOptions {
  /** OpenRouteService API root. Defaults to the public hosted API. */
  baseUrl?: string;
  authentication?: ProviderAuthentication;
  http?: HttpClientOptions;
}
