import type { ProviderCapabilities } from "#core";

const profiles = ["car", "bike", "hike"] as const;

export const GRAPHHOPPER_CAPABILITIES: ProviderCapabilities = {
  directions: {
    supported: true,
    profiles,
    semantics: "native",
  },
  nearest: {
    supported: true,
    profiles,
    semantics: "approximation",
    notes:
      "Implemented using reverse geocoding rather than native road-network snapping.",
  },
  matrix: {
    supported: true,
    profiles,
    semantics: "native",
  },
  isochrones: {
    supported: true,
    profiles,
    semantics: "native",
  },
};
