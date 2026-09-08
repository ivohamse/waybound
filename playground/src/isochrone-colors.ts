import maplibregl from "maplibre-gl";

const isochroneColorExpression = [
  "match",
  ["get", "index"],
  0, "#22c55e",
  1, "#eab308",
  2, "#f97316",
  3, "#ef4444",
  4, "#a855f7",
  "#2563eb",
] as const;

const originalAddLayer = maplibregl.Map.prototype.addLayer;

maplibregl.Map.prototype.addLayer = function (...args: Parameters<typeof originalAddLayer>) {
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
