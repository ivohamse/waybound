# waybound 🚀

A unified, multi-provider routing and geospatial engine for TypeScript.

Waybound provides one consistent API for routing providers such as OpenRouteService and GraphHopper. It normalizes provider-specific behavior into shared, type-safe contracts for routing, nearest-point lookup, matrices and isochrones.

> **Status: alpha**
> Waybound is still evolving before v1.0 and breaking changes may occur between minor releases.

## Features

- Unified API for OpenRouteService and GraphHopper
- Routing with optional turn-by-turn instructions
- Nearest-point lookup
- Distance and duration matrices
- Time- and distance-based isochrones
- Shared `car`, `bike` and `hike` profiles
- GeoJSON geometry output
- Provider capability inspection
- Typed errors and built-in query validation
- Configurable timeout and retry handling

## Installation

```bash
npm install waybound@alpha
```

## Quick start

```typescript
import { Router, OpenRouteServiceProvider } from "waybound";

const router = new Router({
  provider: new OpenRouteServiceProvider({
    authentication: { type: "api-key", value: "YOUR_API_KEY" },
  }),
});

const response = await router.getRoute({
  coordinates: [
    [5.12142, 52.09063],
    [5.11142, 52.09],
  ],
  profile: "hike",
  options: {
    instructions: true,
  },
});

const route = response.routes[0];

console.log(route.distance);
console.log(route.duration);
console.log(route.geometry);
```

Switching providers only requires passing another provider instance:

```typescript
import { Router, GraphHopperProvider } from "waybound";

const router = new Router({
  provider: new GraphHopperProvider({
    authentication: { type: "api-key", value: "YOUR_API_KEY" },
  }),
});
```

## Provider configuration and migration

`RouterConfig.provider` accepts a `RoutingProvider` instance. The router does not
select or construct providers. Both built-in provider classes and the
`RoutingProvider` interface are exported from `waybound`, so custom providers can
implement the same contract without changing the router.

This replaces the earlier `{ provider: "ors", apiKey, http }` configuration.
Move credentials and HTTP options to the provider configuration object:

```typescript
const provider = new OpenRouteServiceProvider({
  authentication: { type: "api-key", value: "YOUR_API_KEY" },
  http: { timeoutMs: 5_000, maxRetries: 1 },
});
const router = new Router({ provider });
```

The router still handles query validation, capability checks and error
normalization. Provider selection strings are now an application concern; the
former `ProviderType` export has been removed. Authentication is declared per feature in `capabilities`; the router rejects a missing or incompatible credential before making a request. Custom implementations can declare authentication-free features.

Packaging remains a single npm package with the existing root entry point.

## Authentication

Authentication belongs to the provider instance, not `Router`. Each feature exposes
its requirement in `router.capabilities.<feature>.authentication`:

```ts
{
  required: true,
  schemes: ["api-key"],
}
```

The built-in hosted ORS and GraphHopper adapters currently require an API key for
all implemented features. Constructing either provider without credentials is
allowed, but the router rejects a call with `MISSING_CREDENTIAL` before sending an
HTTP request. A credential with an unsupported scheme produces
`UNSUPPORTED_AUTHENTICATION`.

Custom providers can expose an authentication-free feature with
`authentication: { required: false, schemes: [] }`; they set the non-sensitive
`authenticationSchemes` list on the provider instance. Credentials themselves are
never exposed through `Router` or capabilities.

Provider configuration deliberately leaves endpoint URLs out of scope for now.
See issue #24 for self-hosted and custom-endpoint support.

## Core conventions

Waybound normalizes provider responses into a shared contract.

- Coordinates use `[longitude, latitude]`
- Distances are expressed in **meters**
- Durations are expressed in **seconds**
- Standalone geometric results use **GeoJSON**

For example:

- routes return a GeoJSON `LineString`
- nearest results return a GeoJSON `Point`
- isochrones return GeoJSON `Polygon` or `MultiPolygon`

## Supported features

| Feature | OpenRouteService | GraphHopper |
| --- | --- | --- |
| Routing | ✅ | ✅ |
| Nearest point | ✅ Native snapping | ✅ Approximation |
| Matrix | ✅ | ✅ |
| Isochrones | ✅ | ✅ |

GraphHopper currently implements nearest-point lookup using reverse geocoding rather than native road-network snapping. Waybound exposes this through the same API, but marks the capability as an approximation.

## Error handling

Waybound uses `WayboundError` to normalize validation, provider, network and capability errors.

```typescript
import { WayboundError } from "waybound";

try {
  // Waybound request
} catch (error) {
  if (error instanceof WayboundError) {
    console.error(error.code);
    console.error(error.message);
  }
}
```

## Roadmap

### v0.4.0

- Public API contract hardening
- Consistent GeoJSON geometry contracts
- Consistent distance and duration conventions
- Documentation cleanup
- First npm alpha publication

### Before v1.0

- Further stabilize the public API
- Expand provider and feature support
- Improve documentation
- Define backwards-compatibility guarantees
- Validate the v1 API through beta and release-candidate prereleases

## Testing

Run `npm run test:report` for offline tests, or `npm run test:live:report` for
the provider capability matrix (API keys required). See [test reporting](tests/reporting/README.md)
for provider selection, pacing, coverage and structured diagnostics.

## License

MIT © 2026
