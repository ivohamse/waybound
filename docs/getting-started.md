# Getting started

## Install

```bash
npm install waybound@alpha
```

## Calculate a route

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
```

Pass another provider instance to `Router` to switch provider. Coordinates use `[longitude, latitude]`; distances use meters, durations use seconds, and geometries use GeoJSON.

## Other features

The same router exposes the other supported provider-neutral operations.

### Nearest point

```ts
const response = await router.getNearest({
  coordinates: [[5.12142, 52.09063]],
  profile: "hike",
});

console.log(response.points[0].nearestPoint);
```

### Matrix

```ts
const response = await router.getMatrix({
  coordinates: [[5.12142, 52.09063], [5.11142, 52.09]],
  profile: "bike",
});

console.log(response.distances, response.durations);
```

### Isochrones

```ts
const response = await router.getIsochrones({
  coordinate: [5.12142, 52.09063],
  profile: "hike",
  options: { rangeType: "time", ranges: [300, 600, 900] },
});

console.log(response.isochrones[0].geometry);
```

## Next steps

- [Configuration](configuration.md)
- [Providers](providers.md)
- [Errors](errors.md)
