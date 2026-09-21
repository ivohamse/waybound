# Roadmap

Waybound’s v1.0 goal is a stable, provider-agnostic TypeScript routing API. Its central promise is that every supported geometric result is valid GeoJSON in WGS84 coordinate order (`[longitude, latitude]`), regardless of provider or hosting model.

GitHub Project **Waybound Product Release** is the operational source for individual work items and their status. This document records the intended product scope and release-level acceptance criteria; it is not a delivery-date commitment.

## v1.0 contract

- Support OpenRouteService, GraphHopper, Valhalla, BRouter, Mapbox and OSRM.
- All providers support directions.
- Expose a stable, capability-driven API for directions, nearest, matrix, isochrones and map matching where the provider supports them.
- Normalize geometric results to valid GeoJSON:
  - directions and map matching: `LineString`;
  - nearest: `Point`;
  - isochrones: `Polygon` or `MultiPolygon`.
- Preserve provider-specific strengths at the input boundary through documented custom/provider profiles, while keeping the primary result model uniform.
- Offer the original decoded provider response only as explicit opt-in metadata alongside the normalized result. It is never part of the primary Waybound contract.
- Use metres and seconds consistently, and return stable typed errors for validation, authentication, transport, rate-limit and invalid-provider-response failures.
- Make provider capabilities, profiles, authentication requirements and self-hosted `baseUrl` behaviour explicit and queryable.
- Maintain deterministic unit and contract tests for every claimed provider-feature-profile combination; live tests complement but never replace them.

Not every provider must support every feature. Unsupported functionality must be accurately represented by its capabilities rather than simulated or silently approximated.

## Release path

### v0.4.x — alpha hardening

Finish the current alpha line: validate the public API, documentation, package publication flow and live-provider diagnostics.

### v0.5.0 — v1 contract foundation

Finalize public result and request contracts, GeoJSON invariants, raw-response opt-in, provider-extension/profile model, capability semantics and reusable provider contract tests.

### v0.6.0 — self-hosted provider foundations

Add Valhalla and OSRM, beginning with directions and the features each can honestly support. Apply the same self-hosting, normalization and contract-test standards as the built-in providers.

### v0.7.0 — map matching

Introduce `router.match()` as a public capability. Normalize matched geometry and trace-point relationships, distinguish partial/no matches from provider failures, and add realistic noisy-GPS fixtures.

### v0.8.0 — specialist and hosted providers

Add BRouter with an explicit custom-profile path, then Mapbox with clear token and capability documentation.

### v0.9.0 — release candidate

Complete the provider × feature × profile contract matrix, harden deterministic and live validation, review API ergonomics and compatibility, document self-hosting and provider differences, and use the playground as a visual smoke test.

### v1.0.0 — stable release

Release only when the v1 contract, documented provider support, GeoJSON guarantees, capabilities, errors, tests and production-oriented documentation are complete.

## Deliberately after v1.0

Traffic-aware routing, navigation instructions with universal semantics, vehicle optimisation, public transport, library-owned caching and separate provider npm packages are outside v1.0. Provider-specific entry points may be introduced alongside the full package in v1.1 or later, once bundling measurements justify them.
