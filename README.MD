# Waybound

A unified TypeScript routing API for multiple providers.

Waybound gives applications a consistent, type-safe interface for routing, nearest-point lookup, matrices and isochrones, independent of the selected provider.

> **Status: alpha.** Breaking changes may occur before v1.0. [Roadmap](https://github.com/ivohamse/waybound/blob/main/docs/roadmap.md) · [Changelog](https://github.com/ivohamse/waybound/blob/main/CHANGELOG.md)

## Supported providers

| Feature | OpenRouteService | GraphHopper |
| --- | --- | --- |
| Routing | ✅ | ✅ |
| Nearest point | ✅ Native snapping | ✅ Approximation |
| Matrix | ✅ | ✅ |
| Isochrones | ✅ | ✅ |

See [Providers](https://github.com/ivohamse/waybound/blob/main/docs/providers.md) for provider-specific notes and configuration.

## Features

- Provider-neutral, type-safe contracts
- Routes with optional turn-by-turn instructions
- Nearest-point lookup, matrices and isochrones
- Shared `car`, `bike` and `hike` profiles
- GeoJSON geometry output
- Capability inspection and observed availability
- Typed errors, query validation, timeouts and retries

## Installation

```bash
npm install waybound@alpha
```

## Quick start

```ts
import { Router, OpenRouteServiceProvider } from "waybound";

const router = new Router({
  provider: new OpenRouteServiceProvider({
    authentication: { type: "api-key", value: "YOUR_API_KEY" },
  }),
});

const response = await router.getRoute({
  coordinates: [[5.12142, 52.09063], [5.11142, 52.09]],
  profile: "hike",
  options: { instructions: true },
});

const route = response.routes[0];
console.log(route.distance, route.duration, route.geometry);
```

## Core conventions

- Coordinates use `[longitude, latitude]`.
- Distances use meters; durations use seconds.
- Geometries use GeoJSON.

## Documentation

- [Getting started](https://github.com/ivohamse/waybound/blob/main/docs/getting-started.md)
- [Configuration](https://github.com/ivohamse/waybound/blob/main/docs/configuration.md)
- [Providers](https://github.com/ivohamse/waybound/blob/main/docs/providers.md)
- [Capabilities and availability](https://github.com/ivohamse/waybound/blob/main/docs/capabilities.md)
- [Errors](https://github.com/ivohamse/waybound/blob/main/docs/errors.md)
- [Live testing](https://github.com/ivohamse/waybound/blob/main/docs/live-testing.md)
- [Playground](https://github.com/ivohamse/waybound/blob/main/docs/playground.md)
- [Contributing](https://github.com/ivohamse/waybound/blob/main/docs/contributing.md)

## License

MIT © 2026
