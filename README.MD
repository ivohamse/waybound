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

Waybound is not yet published to npm.

npm publication is planned for a future release.

Once published:

```bash
npm install waybound
```

## Quick start

```typescript
import { Router } from "waybound";

const router = new Router({
  provider: "ors",
  apiKey: "YOUR_API_KEY",
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

Switching providers only requires changing the router configuration:

```typescript
const router = new Router({
  provider: "graphhopper",
  apiKey: "YOUR_API_KEY",
});
```

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
- Release preparation

### Before v1.0

- Further stabilize the public API
- Expand provider and feature support
- Improve documentation
- Define backwards-compatibility guarantees

## License

MIT © 2026
