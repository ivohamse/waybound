# Waybound

A unified TypeScript routing API for multiple providers.

Waybound gives applications a consistent, type-safe interface for routing, nearest-point lookup, matrices and isochrones, independent of the selected provider.

> **Status: alpha.** Breaking changes may occur before v1.0. [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md)

## Supported providers

| Feature | OpenRouteService | GraphHopper |
| --- | --- | --- |
| Routing | ✅ | ✅ |
| Nearest point | ✅ Native snapping | ✅ Approximation |
| Matrix | ✅ | ✅ |
| Isochrones | ✅ | ✅ |

See [Providers](docs/providers.md) for provider-specific notes and configuration.

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

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Providers](docs/providers.md)
- [Capabilities and availability](docs/capabilities.md)
- [Errors](docs/errors.md)
- [Live testing](docs/live-testing.md)
- [Playground](docs/playground.md)
- [Contributing](docs/contributing.md)

## License

MIT © 2026
