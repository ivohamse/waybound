import type { ProviderAuthentication } from "#types";
import type { HttpClientOptions } from "#http";

export interface OpenRouteServiceProviderOptions {
  authentication?: ProviderAuthentication;
  http?: HttpClientOptions;
}
