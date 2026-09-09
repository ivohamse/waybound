import type { ProviderCapabilities } from "#core";

const profiles = ["car", "bike", "hike"] as const;
const apiKeyAuthentication = { required: true, schemes: ["api-key"] as const };

export const GRAPHHOPPER_CAPABILITIES: ProviderCapabilities = {
  directions: {
    supported: true,
    profiles,
    options: ["language", "elevation", "instructions"],
    authentication: apiKeyAuthentication,
    semantics: "native",
  },
  nearest: {
    supported: true,
    profiles,
    options: ["language"],
    authentication: apiKeyAuthentication,
    semantics: "approximation",
    notes:
      "Implemented using reverse geocoding rather than native road-network snapping.",
  },
  matrix: {
    supported: true,
    profiles,
    options: [],
    authentication: apiKeyAuthentication,
    semantics: "native",
  },
  isochrones: {
    supported: true,
    profiles,
    options: ["rangeType", "ranges"],
    authentication: apiKeyAuthentication,
    semantics: "native",
  },
};
