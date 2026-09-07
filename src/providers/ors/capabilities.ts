import type { ProviderCapabilities } from "../../capabilities";

const profiles = ["car", "bike", "hike"] as const;

export const ORS_CAPABILITIES: ProviderCapabilities = {
  directions: {
    supported: true,
    profiles,
    semantics: "native",
  },
  nearest: {
    supported: true,
    profiles,
    semantics: "native",
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
