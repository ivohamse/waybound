import type { ProviderAuthentication } from "#types";
import type { HttpClientOptions } from "#http";

export interface GraphHopperProviderOptions {
  authentication?: ProviderAuthentication;
  http?: HttpClientOptions;
}
