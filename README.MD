# waybound 🚀

A unified, multi-provider routing and geospatial engine for TypeScript and Node.js.

`waybound` wraps heavy-duty routing providers (like OpenRouteService and GraphHopper) behind a single, consistent, type-safe API. It automatically handles data transformations into clean **GeoJSON**, respects strict server guidelines, and features built-in **HTTP 429 (Too Many Requests) auto-retry handling** with jittered exponential backoff.

> 📦 **Status: v0.3.2 (Beta - Patch Pack)** - Core routing, advanced matrix computations, isochrone generation, and turn-by-turn maneuvers are fully operational under a 100% successful unit test harness.

## Features

- 🌍 **Unified API**: Switch providers (`ors` or `graphhopper`) via a single constructor config string.
- 🚴 **Outdoor Focused**: Full support for `bike` (cycling) and `hike` (pedestrian) profiles.
- 🗺️ **Pure GeoJSON**: Returns standard GeoJSON layouts (`LineString` and `Polygon`).
- 🛡️ **Rate-Limit Proof**: Built-in network shield that intercepts HTTP 429 throttling and gracefully retries requests using smart backing off.
- 📊 **Strict Type Safety**: Granular, split options interfaces (`RouteOptions`, `NearestOptions`, `IsochroneOptions`) to enforce compile-time error prevention.
- 🪶 **Zero Dependencies**: Lightweight design leveraging native environment fetch.

## Installation

```bash
npm install waybound
```

## Quick Start

```typescript
import { Router } from "waybound";

async function main() {
  const router = new Router({
    provider: "ors", // or 'graphhopper'
    apiKey: "YOUR_API_KEY",
  });

  // 1. Calculate a route with Turn-by-Turn Maneuvers
  const routeResponse = await router.getRoute({
    coordinates: [
      [5.12142, 52.09063], // Domtoren Utrecht [Lng, Lat]
      [5.11142, 52.09], // Centraal Station [Lng, Lat]
    ],
    profile: "hike",
    options: {
      language: "nl",
      instructions: true, // Unlock textual turn-by-turn arrays!
    },
  });

  const mainRoute = routeResponse.routes[0];
  console.log(`Distance: ${mainRoute.distanceMeters}m`);
  console.log(`First instruction: "${mainRoute.maneuvers[0].instruction}"`);

  // 2. Generate Isochrones (15-minute reachability polygon via ORS)
  const isoResponse = await router.getIsochrones({
    coordinate: [5.12142, 52.09063],
    profile: "bike",
    options: {
      rangeType: "time",
      ranges: [900], // 900 seconds = 15 minutes
    },
  });
  console.log(`Geometry Type: ${isoResponse.isochrones[0].geometry.type}`); // "Polygon"
}

main().catch(console.error);
```

## Release Roadmap 🗺️

`waybound` follows a strict release strategy. Minor releases (`0.X.0`) introduce thematic Feature Packs, while patches (`0.X.Y`) are exclusively reserved for bugfixes and optimization.

### 📦 v0.1.x — Core Routing

- [x] Symmetrische **Builder & Client** architecture per provider.
- [x] `getRoute` (Standard A-to-B routing with GeoJSON `LineString` output).
- [x] `getNearest` (GPS coordinate snapping to nearest road).
- [x] HTTP 429 Jittered Exponential Backoff & network shielding.

### 📊 v0.2.x & v0.3.x — Geospatial Analysis & Fleet Pack (Current)

- [x] `getMatrix`: Multi-origin, multi-destination distance and time matrices.
- [x] `getIsochrones`: GeoJSON reachability polygons based on time/distance buffers.
- [x] Granular options splitting (`RouteOptions`, `NearestOptions`, `IsochroneOptions`).
- [x] **Maneuvers & Turn-by-Turn**: Textual driving/walking instructions.
- [x] **Waypoints Optimization**: Automated sequence reordering (TSP support).
- [x] **100% Unit Test Coverage**: Core layers fully tested with Vitest harness.

### 🔌 v0.4.0 — Ecosystem Pack (Next Milestone)

- [ ] **Stadia Maps (Valhalla Engine)**: Native driver integration to unlock tile-routing.
- [ ] **Mapbox Routing API**: Dedicated commercial driver support.
- [ ] **Self-Hosted Mode**: Pre-configured setup to bypass api keys and point to your local Docker infrastructure.

### 🚀 v1.0.0 — Production Ready

- [ ] Global Throttling (Local Token Bucket queue to handle high-parallel loads).
- [ ] Stable production API freeze.

## License

MIT © 2026
