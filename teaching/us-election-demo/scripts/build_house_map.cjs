// Project the checked-in Census geometry once, keeping interactive rendering cheap.
const fs = require("node:fs");
const path = require("node:path");
const d3 = require("d3-geo");
const topojson = require("topojson-client");
const root = path.resolve(__dirname, "..");
const source = JSON.parse(
  fs.readFileSync(path.join(root, "public/data/house-districts-2026.geojson")),
);
const states = require("us-atlas/states-10m.json");
const projection = d3.geoAlbersUsa().translate([500, 310]).scale(1250);
const geoPath = d3.geoPath(projection);
const compact = (value) =>
  value.replace(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi, (n) =>
    String(Math.round(Number(n) * 100) / 100),
  );
const projected = source.features.map((original) => {
  const feature = JSON.parse(JSON.stringify(original));
  // RFC 7946 uses counterclockwise outer rings; d3-geo's spherical convention is opposite.
  if (d3.geoArea(feature) > 2 * Math.PI) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    polygons.forEach((polygon) => polygon.forEach((ring) => ring.reverse()));
  }
  if (d3.geoArea(feature) > 2 * Math.PI)
    throw new Error(`Invalid winding: ${feature.id}`);
  const d = geoPath(feature),
    bounds = geoPath.bounds(feature),
    center = geoPath.centroid(feature);
  if (!d || !bounds.flat().every(Number.isFinite))
    throw new Error(`Missing geometry: ${feature.id}`);
  return {
    id: feature.id,
    state: feature.properties.state,
    d: compact(d),
    bounds,
    center,
  };
});
const result = {
  width: 1000,
  height: 620,
  land: compact(geoPath(topojson.feature(states, states.objects.states))),
  stateBorders: compact(
    geoPath(topojson.mesh(states, states.objects.states, (a, b) => a !== b)),
  ),
  districts: projected,
};
fs.writeFileSync(
  path.join(root, "src/data/house-map.json"),
  JSON.stringify(result),
);
console.log(
  `Projected ${projected.length} districts; ${Math.round(JSON.stringify(result).length / 1024)} KiB.`,
);
