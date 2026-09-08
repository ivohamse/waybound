# Waybound Playground

Visual consumer playground for Waybound.

The playground intentionally consumes Waybound through the package root (`import { Router } from "waybound"`) rather than internal source modules.

## Run locally

From the repository root, build Waybound first:

```bash
npm run build
```

Then install and start the playground:

```bash
cd playground
npm install
npm run dev
```

You can enter provider API keys in the toolbar. Optionally create a local `.env` from `.env.example` to preload them.

## Current scope

- Switch between OpenRouteService and GraphHopper
- Switch between `hike`, `bike` and `car`
- Choose start and end points visually on the map
- Render the returned route GeoJSON
- Inspect distance, duration and maneuvers
- Surface Waybound errors directly in the UI

Nearest, isochrones and matrix visualization can be added next.
