import type { ProviderCapabilities } from "#core";

const profiles = ["car", "bike", "hike"] as const;

export const GRAPHHOPPER_CAPABILITIES: ProviderCapabilities = {
  directions: {
    supported: true,
    profiles,
    options: ["language", "elevation", "instructions"],
    semantics: "native",
  },
  nearest: {
    supported: true,
    profiles,
    options: ["language"],
    semantics: "approximation",
    notes:
      "Implemented using reverse geocoding rather than native road-network snapping.",
  },
  matrix: {
    supported: true,
    profiles,
    options: [],
    semantics: "native",
  },
  isochrones: {
    supported: true,
    profiles,
    options: ["rangeType", "ranges"],
    semantics: "native",
  },
};
