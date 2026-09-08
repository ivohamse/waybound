import type { ProviderCapabilities } from "#core";

const profiles = ["car", "bike", "hike"] as const;

export const ORS_CAPABILITIES: ProviderCapabilities = {
  directions: {
    supported: true,
    profiles,
    options: ["language", "elevation", "instructions"],
    semantics: "native",
  },
  nearest: {
    supported: true,
    profiles,
    options: ["radius"],
    semantics: "native",
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
