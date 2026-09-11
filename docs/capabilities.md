# Capabilities and availability

`capabilities` describes what a provider adapter supports. It is not a promise that a specific account or endpoint allows every feature.

## Declared capabilities

Each feature specifies supported profiles and authentication requirements. The router validates these before sending a request.

## Observed availability

Use `probeCapabilities()` to explicitly test a configured endpoint and credentials. Normal feature calls never send an additional availability request; successful and failed calls update the same in-memory observation cache.

```ts
await router.probeCapabilities({
  coordinates: [[5.12142, 52.09063], [5.11142, 52.09]],
  targets: [{ feature: "isochrones", profile: "hike" }],
});

router.getObservedAvailability("isochrones", "hike");
// "available", "unavailable" or "unknown" via ?.availability
```

Observations are scoped to the provider instance and expire after one hour. A changed API key therefore has a fresh cache. Pass `force: true` to bypass a valid cached observation.

Use coordinates served by the selected endpoint. Rate limits, timeouts and ambiguous provider errors are `unknown`, not an entitlement decision.
