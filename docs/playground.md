# Playground

The playground is a desktop-first visual integration tool for testing Waybound against real providers. It is a separate Vite application in `playground/` and consumes Waybound through its public package entry point.

## Start it

Install the repository dependencies, then start the playground:

```bash
npm install
npm --prefix playground install
npm run playground:dev
```

For a production build check:

```bash
npm run playground:build
```

## Use the playground

1. Choose OpenRouteService or GraphHopper in the provider dialog.
2. Enter an API key when the selected provider and feature require one. Keys are kept only in memory for the current browser session.
3. Select a profile and feature from the toolbar.
4. Click the map to set the required points, then run the feature.

The playground supports routes, nearest-point lookup, matrices and isochrones. Routes, nearest results and isochrones are rendered as GeoJSON overlays; matrices are shown in the result table.

## Provider considerations

Availability depends on the configured credentials, account plan, API limits and server configuration. A feature can be implemented by an adapter but unavailable on a particular hosted plan. The playground presents provider errors, while [capabilities and availability](capabilities.md) describes the corresponding library API.

## Map rendering

The playground uses MapLibre GL JS. Its GeoJSON worker is explicitly configured for Vite so that routes, nearest results and isochrones render correctly in both development and production builds.

## Related guides

- [Live testing](live-testing.md)
- [Configuration](configuration.md)
- [Capabilities and availability](capabilities.md)
