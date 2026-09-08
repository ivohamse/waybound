# Waybound Playground

Visual consumer playground for Waybound.

The playground intentionally consumes Waybound through the package root (`import { Router } from "waybound"`) rather than internal source modules. It is intended as a developer tool for visually checking provider-neutral behavior across supported routing features.

## Run locally

From the repository root:

```bash
npm install
npm --prefix playground install
npm run playground
```

The root `playground` script builds Waybound first and then starts the Vite playground.

## Provider setup

The playground asks you to choose a provider when it starts.

- The selected provider is remembered in `localStorage`.
- API keys are kept in `sessionStorage`, so they survive a refresh but are not stored permanently.
- Switching to a provider with a known session API key happens directly from the provider dropdown.
- Switching to a provider without a known key opens the provider dialog.
- `.env.example` can optionally be used to preload provider API keys for local development.

## Current scope

- OpenRouteService and GraphHopper
- `hike`, `bike` and `car` profiles
- Route visualization with distance, duration and maneuvers
- Route instruction language testing
- Nearest-point visualization
- Distance and duration matrices
- Time- and distance-based isochrones with distinct range colors
- Structured Waybound error output
- Persistent playground options across page reloads

Map points themselves are intentionally not persisted.
