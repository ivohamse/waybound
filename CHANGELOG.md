# Changelog

Waybound is still in active pre-1.0 development. This changelog tracks notable changes during the alpha phase and will be reset/restructured for the stable v1.0 release line.

## Unreleased

### Changed

- **Breaking:** Built-in provider constructors now take one configuration object.
  Use `new OpenRouteServiceProvider({ authentication: { type: "api-key", value }, http })`
  and the equivalent GraphHopper form.
- Authentication requirements are exposed per capability; missing or incompatible
  credentials fail before a network request with typed errors.
- Live provider errors and account limitations now fail tests instead of being
  accepted as diagnostic successes. Old latest reports are cleared before each run.
- **Breaking:** `RouterConfig.provider` now takes a `RoutingProvider` instance
  instead of a provider-name string. Pass API keys and HTTP options to the
  provider constructor, e.g. `new Router({ provider: new OpenRouteServiceProvider({ authentication: { type: "api-key", value: apiKey }, http }) })`.
- Removed the closed `ProviderType` union from the public API; provider selection
  identifiers now belong to the consuming application.
- Migrated the playground, live tests and documentation to provider instances.

### Added

- Public provider authentication types and provider option types, ready for
  API-key, bearer-token and authentication-free provider implementations.

- Capability-driven live coverage across both providers and all supported profiles,
  including separate time/distance isochrone cases (30 cases currently).
- Sequential live requests with configurable provider selection, pacing and timeout.
- Provider, feature, profile, HTTP and timing metadata in live JSON/log reports.
- Regression coverage for diagnostic failures and report-runner failure handling.
- Public package-root exports for `RoutingProvider`, `OpenRouteServiceProvider`
  and `GraphHopperProvider`, including support for custom provider implementations.

## 0.4.0-alpha.1

### Added

- Provider capability metadata and option support checks.
- Central provider-independent query validation.
- GeoJSON `Point` output for nearest-point results.
- Explicit package-root public exports.

### Changed

- Standardized public distance values on meters and duration values on seconds.
- Simplified public field names to `distance` and `duration`.
- Renamed nearest-result geometry to `nearestPoint`.
- Tightened route results by removing provider-specific `weight` and `waypointOrder` fields.
- Refined isochrone results to expose either `distance` or `duration` alongside GeoJSON geometry.
- Reorganized source modules into clearer core, types, HTTP and provider boundaries.
- Simplified the README for the first npm alpha release.

### Fixed

- Improved provider response validation, typed error handling, timeout handling and retry behavior across routing providers.
