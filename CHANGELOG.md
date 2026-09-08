# Changelog

Waybound is still in active pre-1.0 development. This changelog tracks notable changes during the alpha phase and will be reset/restructured for the stable v1.0 release line.

## 0.4.0-alpha.1

### Added

- Provider capability metadata and option support checks.
- Central provider-independent query validation.
- GeoJSON `Point` output for nearest-point results.
- Explicit package-root public exports.

### Changed

- Standardized public distance values on meters and duration values on seconds.
- Simplified public field names to `distance` and `duration`.
- Renamed nearest-result geometry to `nearestPoint`.
- Tightened route results by removing provider-specific `weight` and `waypointOrder` fields.
- Refined isochrone results to expose either `distance` or `duration` alongside GeoJSON geometry.
- Reorganized source modules into clearer core, types, HTTP and provider boundaries.
- Simplified the README for the first npm alpha release.

### Fixed

- Improved provider response validation, typed error handling, timeout handling and retry behavior across routing providers.
