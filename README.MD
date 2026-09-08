# waybound 🚀

A unified, multi-provider routing and geospatial engine for TypeScript and Node.js.

`waybound` wraps routing providers such as OpenRouteService and GraphHopper behind one consistent, type-safe API. It normalizes provider responses into shared Waybound contracts, uses GeoJSON for route and isochrone geometries, and includes built-in timeout, retry, rate-limit and typed error handling.

> 📦 **Status: v0.3.3 (alpha)** — OpenRouteService and GraphHopper are supported for routing, nearest-point lookup, matrices and isochrones. The public API is still evolving before v1.0, so breaking changes may occur between minor releases.

## Features

- 🌍 **Unified provider API**: switch between `ors` and `graphhopper` using the same `Router` interface.
- 🚗 **Shared profiles**: `car`, `bike` and `hike`.
- 🗺️ **GeoJSON geometry**: routes return GeoJSON `LineString`; isochrones return GeoJSON `Polygon` or `MultiPolygon`.
- 🧭 **Directions & maneuvers**: distance, duration, route geometry and optional turn-by-turn instructions.
- 📍 **Nearest-point lookup**: native ORS road-network snapping and a documented GraphHopper reverse-geocoding approximation.
- 📊 **Matrix routing**: distance and duration matrices across multiple coordinates.
- ⭕ **Isochrones**: time- or distance-based reachability polygons.
- 🧩 **Provider capabilities**: inspect supported features, profiles, semantics and query options at runtime.
- 🛡️ **Typed errors**: provider, network, timeout, rate-limit, invalid-response and unsupported-capability failures use `WayboundError`.
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
  console.log(`Distance: ${mainRoute.distanceMeters}m`);
  console.log(`Duration: ${mainRoute.durationSeconds}s`);
  console.log(mainRoute.geometry.type); // "LineString"

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

## Error handling

Waybound exposes a typed `WayboundError` with error codes including:

```text
UNSUPPORTED_PROVIDER
UNSUPPORTED_FEATURE
UNSUPPORTED_PROFILE
UNSUPPORTED_OPTION
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
- [x] Reorganized `core`, `types`, `http` and provider module structure.

### 🚧 v0.4.0 — Contract hardening

Planned before the next minor release:

- [ ] Central query/input validation.
- [ ] Review and tighten the public API and GeoJSON contracts.
- [ ] Refresh API examples and documentation around the stabilized v0.4 contracts.

### 🔭 After v0.4.0

Possible follow-up work includes:

- Runtime/account-aware provider availability.
- Map matching as a separate feature from nearest-point lookup.
- Additional routing providers.
- More provider-specific capabilities where they fit the shared abstraction.
- Further GeoJSON-first response refinement before v1.0.

### 🚀 v1.0.0 — Stable public API

- [ ] Stable public contracts and backwards-compatibility expectations.
- [ ] Production-ready documentation and release guarantees.

## License

MIT © 2026
