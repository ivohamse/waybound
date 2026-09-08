# waybound 🚀

A unified, multi-provider routing and geospatial engine for TypeScript and Node.js.

`waybound` wraps routing providers such as OpenRouteService and GraphHopper behind one consistent, type-safe API. It normalizes provider responses into shared Waybound contracts, uses GeoJSON for geometric response data, and includes built-in timeout, retry, rate-limit and typed error handling.

> 📦 **Status: v0.3.3 (alpha)** — OpenRouteService and GraphHopper are supported for routing, nearest-point lookup, matrices and isochrones. The public API is still evolving before v1.0, so breaking changes may occur between minor releases.

## Features

- 🌍 **Unified provider API**: switch between `ors` and `graphhopper` using the same `Router` interface.
- 🚗 **Shared profiles**: `car`, `bike` and `hike`.
- 🗺️ **GeoJSON response geometry**: routes return GeoJSON `LineString`, nearest results return GeoJSON `Point`, and isochrones return GeoJSON `Polygon` or `MultiPolygon`.
- 🧭 **Directions & maneuvers**: distance, duration, route geometry and optional turn-by-turn instructions.
- 📍 **Nearest-point lookup**: native ORS road-network snapping and a documented GraphHopper reverse-geocoding approximation.
- 📊 **Matrix routing**: distance and duration matrices across multiple coordinates.
- ⭕ **Isochrones**: time- or distance-based reachability polygons.
- 🧩 **Provider capabilities**: inspect supported features, profiles, semantics and query options at runtime.
- ✅ **Query validation**: invalid coordinate bounds, empty queries, invalid radii and invalid isochrone ranges are rejected before provider interaction.
- 🛡️ **Typed errors**: provider, query, network, timeout, rate-limit, invalid-response and unsupported-capability failures use `WayboundError`.
- 🔁 **Resilient HTTP transport**: configurable per-attempt timeout and retry behavior with `Retry-After` support and jittered backoff.
- 🪶 **No runtime dependencies**: built on native `fetch`; development tooling is kept in `devDependencies`.

## Installation

```bash
npm install waybound
```

## Quick Start

```typescript
import { Router } from "waybound";

async function main() {
  const router = new Router({
    provider: "ors", // or "graphhopper"
    apiKey: "YOUR_API_KEY",
    http: {
      timeoutMs: 10_000,
      maxRetries: 3,
    },
  });

  const routeResponse = await router.getRoute({
    coordinates: [
      [5.12142, 52.09063], // Utrecht centre [Lng, Lat]
      [5.11142, 52.09],   // Utrecht Central Station [Lng, Lat]
    ],
    profile: "hike",
    options: {
      language: "nl",
      instructions: true,
      elevation: false,
    },
  });

  const mainRoute = routeResponse.routes[0];
  console.log(`Distance: ${mainRoute.distance}m`);
  console.log(`Duration: ${mainRoute.duration}s`);
  console.log(mainRoute.geometry.type); // "LineString"

  const nearestResponse = await router.getNearest({
    coordinates: [[5.12142, 52.09063]],
    profile: "hike",
    options: { radius: 500 },
  });

  console.log(nearestResponse.points[0].nearestPoint?.type); // "Point"
  console.log(nearestResponse.points[0].nearestPoint?.coordinates);

  const isoResponse = await router.getIsochrones({
    coordinate: [5.12142, 52.09063],
    profile: "bike",
    options: {
      rangeType: "time",
      ranges: [300, 600, 900],
    },
  });

  console.log(isoResponse.isochrones[0].geometry.type); // "Polygon" or "MultiPolygon"
}

main().catch(console.error);
```

## Public API

The package root intentionally exports only the supported Waybound API surface: `Router`, `WayboundError`, router/capability/error types, query and response contracts, `Coordinate`, `ProfileType`, and `HttpClientOptions`.

Provider adapters, raw provider API types, request builders, internal HTTP request types and other implementation details are not part of the package-root public contract.

Input coordinates use the ergonomic Waybound tuple form:

```typescript
type Coordinate = [longitude: number, latitude: number];
```

Waybound uses meters for all distances and seconds for all durations throughout its public API.

Geometric response fields use GeoJSON geometry objects where they represent standalone geometry:

- `RouteResult.geometry` → `LineString`
- `NearestResult.nearestPoint` → `Point | null`
- `IsochroneResult.geometry` → `Polygon | MultiPolygon`

`inputCoordinate` and maneuver coordinates remain coordinate tuples because they represent input/metadata positions rather than standalone geometry results.

## Provider capabilities

Capabilities describe what Waybound currently exposes through its public abstraction. They are intentionally narrower than the complete feature set of each underlying provider.

```typescript
const router = new Router({
  provider: "graphhopper",
  apiKey: "YOUR_API_KEY",
});

console.log(router.capabilities.directions);
```

Current option support:

| Feature | OpenRouteService | GraphHopper |
| --- | --- | --- |
| Directions | `language`, `elevation`, `instructions` | `language`, `elevation`, `instructions` |
| Nearest | `radius` | `language` |
| Matrix | — | — |
| Isochrones | `rangeType`, `ranges` | `rangeType`, `ranges` |

GraphHopper `nearest` is marked with `semantics: "approximation"` because it currently uses reverse geocoding rather than a native road-network snap endpoint.

Unsupported options are rejected by Waybound before a provider request is sent.

## Query validation

Waybound validates provider-independent query rules before performing provider capability checks or HTTP requests. Current validation includes:

- Route queries require at least two coordinates.
- Nearest and matrix queries require at least one coordinate.
- Longitude must be finite and within `-180..180`.
- Latitude must be finite and within `-90..90`.
- Nearest `radius`, when provided, must be finite and greater than zero.
- Isochrone `ranges` must contain at least one positive finite value.

Provider-specific limits such as account quotas, maximum matrix sizes or plan-dependent range limits are intentionally not part of this validation layer.

## Error handling

Waybound exposes a typed `WayboundError` with error codes including:

```text
UNSUPPORTED_PROVIDER
UNSUPPORTED_FEATURE
UNSUPPORTED_PROFILE
UNSUPPORTED_OPTION
INVALID_QUERY
PROVIDER_ERROR
RATE_LIMITED
NETWORK_ERROR
REQUEST_TIMEOUT
INVALID_RESPONSE
```

Example:

```typescript
import { Router, WayboundError } from "waybound";

try {
  // Waybound request
} catch (error) {
  if (error instanceof WayboundError) {
    console.error(error.code, error.provider, error.message);
  }
}
```

## Development

```bash
npm test
npm run build
npm run test:live
```

Live tests require valid provider API keys in the local environment. Unit tests do not call the external provider APIs.

## Roadmap 🗺️

### ✅ v0.3.x — Provider contract foundation

- [x] Shared routing, nearest, matrix and isochrone contracts.
- [x] OpenRouteService and GraphHopper provider adapters.
- [x] Provider-specific API response typing and runtime response validation.
- [x] Shared HTTP transport with timeouts, retries and typed network/provider errors.
- [x] Provider feature/profile capabilities.
- [x] Provider option capabilities and unsupported-option validation.
- [x] Central provider-independent query/input validation.
- [x] Reorganized `core`, `types`, `http` and provider module structure.

### 🚧 v0.4.0 — Contract hardening

Planned before the next minor release:

- [x] Review and tighten the package-root public API.
- [x] Use GeoJSON for standalone geometric response fields, including nearest points.
- [x] Refresh API examples and documentation around the hardened contracts.
- [ ] Final verification and version bump to `0.4.0`.

### 🔭 After v0.4.0

Possible follow-up work includes:

- Runtime/account-aware provider availability.
- Map matching as a separate feature from nearest-point lookup.
- Additional routing providers.
- More provider-specific capabilities where they fit the shared abstraction.
- Further GeoJSON-first response refinement before v1.0 if it materially improves the API.

### 🚀 v1.0.0 — Stable public API

- [ ] Stable public contracts and backwards-compatibility expectations.
- [ ] Production-ready documentation and release guarantees.

## License

MIT © 2026
