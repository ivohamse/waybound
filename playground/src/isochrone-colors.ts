import { Map } from "maplibre-gl";

const isochroneColorExpression = [
  "match",
  ["get", "index"],
  0, "#eab308",
  1, "#f97316",
  2, "#ef4444",
  3, "#db2777",
  4, "#9333ea",
  "#2563eb",
] as const;

const originalAddLayer = Map.prototype.addLayer;

Map.prototype.addLayer = function (...args: Parameters<typeof originalAddLayer>) {
  const layer = args[0];

  if (layer.id === "isochrones-fill" && layer.type === "fill") {
    layer.paint = {
      ...layer.paint,
      "fill-color": isochroneColorExpression,
      "fill-opacity": 0.24,
    };
    layer.layout = {
      ...layer.layout,
      "fill-sort-key": ["-", ["get", "index"]],
    };
  }

  if (layer.id === "isochrones-outline" && layer.type === "line") {
    layer.paint = {
      ...layer.paint,
      "line-color": isochroneColorExpression,
      "line-width": 2.25,
      "line-opacity": 0.9,
    };
    layer.layout = {
      ...layer.layout,
      "line-sort-key": ["-", ["get", "index"]],
    };
  }

  return originalAddLayer.apply(this, args);
};
