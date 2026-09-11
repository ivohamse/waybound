# Providers

Waybound currently ships adapters for OpenRouteService and GraphHopper.

| Feature | OpenRouteService | GraphHopper |
| --- | --- | --- |
| Routing | ✅ | ✅ |
| Nearest point | ✅ Native snapping | ✅ Approximation |
| Matrix | ✅ | ✅ |
| Isochrones | ✅ | ✅ |

## OpenRouteService

Use `OpenRouteServiceProvider` with an API key.

## GraphHopper

Use `GraphHopperProvider` with an API key. Its nearest-point implementation uses reverse geocoding rather than native road-network snapping. Waybound exposes the result through the same API while declaring it as an approximation.

Adapter support does not guarantee account or endpoint availability; see [Capabilities and availability](capabilities.md).
