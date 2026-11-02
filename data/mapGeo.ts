import { geoArea, geoBounds, geoCentroid, geoEqualEarth, geoPath, GeoProjection } from "d3-geo";
import { feature, merge } from "topojson-client";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldTopojson from "world-atlas/countries-110m.json";
import { TOPO_NAME_TO_ALPHA2 } from "@/data/countryCodeMap";
import { WATERS } from "@/data/waters";

// Must match the <ComposableMap> props in MapDisplay
export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 420;
export const MAP_SCALE = 147; // whole globe fits the frame at zoom 1

export const projection: GeoProjection = geoEqualEarth()
  .scale(MAP_SCALE)
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);

/**
 * Countries too small for the 110m world file (or not drawn as their own
 * shape) get a dot marker instead, so they're still visible and clickable.
 */
export const MARKER_COUNTRIES: Record<string, [number, number]> = {
  AD: [1.52, 42.55],
  MC: [7.41, 43.73],
  SM: [12.46, 43.94],
  VA: [12.45, 41.9],
  LI: [9.56, 47.14],
  MT: [14.44, 35.9],
  BH: [50.55, 26.07],
  SG: [103.82, 1.35],
  MV: [73.5, 3.2],
  MU: [57.55, -20.3],
  KM: [43.33, -11.7],
  ST: [6.61, 0.19],
  GF: [-53.1, 3.93],
  PW: [134.58, 7.51],
  FM: [158.2, 6.92],
  MH: [171.18, 7.13],
  NR: [166.93, -0.52],
  KI: [173.0, 1.42],
  TV: [179.2, -8.52],
  WS: [-172.1, -13.76],
  TO: [-175.2, -21.18],
};

type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>;

const world = worldTopojson as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const rawCollection = feature(world, world.objects.countries) as unknown as FeatureCollection<
  Polygon | MultiPolygon,
  { name: string }
>;

/**
 * The world as drawn in the game. Where the atlas splits one game country
 * into several shapes (Israel + Palestine → Palestine), they're merged into
 * a single shape so there's no border line through the middle.
 */
const collection: FeatureCollection<Polygon | MultiPolygon, { name: string }> = (() => {
  const groups = new Map<string, string[]>(); // alpha-2 → atlas names
  for (const f of rawCollection.features) {
    const a2 = TOPO_NAME_TO_ALPHA2[f.properties.name];
    if (a2) groups.set(a2, [...(groups.get(a2) ?? []), f.properties.name]);
  }
  const split = new Map(Array.from(groups).filter(([, names]) => names.length > 1));
  if (split.size === 0) return rawCollection;

  const features = rawCollection.features.filter((f) => !split.has(TOPO_NAME_TO_ALPHA2[f.properties.name]));
  for (const [a2, names] of Array.from(split)) {
    const geoms = world.objects.countries.geometries.filter((g) => names.includes((g.properties as { name: string }).name));
    const keep = names.find((n) => n === nameForCode(a2)) ?? names[0];
    features.push({ type: "Feature", properties: { name: keep }, geometry: merge(world, geoms as never) });
  }
  return { type: "FeatureCollection", features };
})();

function nameForCode(a2: string): string | undefined {
  return Object.keys(TOPO_NAME_TO_ALPHA2).find((n) => TOPO_NAME_TO_ALPHA2[n] === a2 && n !== "Israel");
}

/** Country shapes for the map layer (GeoJSON, with merged shapes applied). */
export const WORLD_FEATURES = collection;

/** Largest single polygon of a country — mainland France, lower-48 US, etc. */
function mainland(f: CountryFeature): Feature<Polygon> {
  if (f.geometry.type === "Polygon") return f as Feature<Polygon>;
  let best: Feature<Polygon> | null = null;
  let bestArea = -1;
  for (const coords of f.geometry.coordinates) {
    const poly: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: coords },
    };
    const a = geoArea(poly);
    if (a > bestArea) {
      bestArea = a;
      best = poly;
    }
  }
  return best!;
}

interface CountryGeo {
  anchor: [number, number]; // lon/lat for labels + route lines
  bounds: [[number, number], [number, number]]; // lon/lat box of the mainland
}

/** Geometry lookup keyed by alpha-2 code. */
export const COUNTRY_GEO: Map<string, CountryGeo> = (() => {
  const m = new Map<string, CountryGeo>();
  const areas = new Map<string, number>();
  for (const f of collection.features as CountryFeature[]) {
    const a2 = TOPO_NAME_TO_ALPHA2[f.properties.name];
    if (!a2) continue;
    const main = mainland(f);
    const area = geoArea(main);
    const geo: CountryGeo = {
      anchor: geoCentroid(main) as [number, number],
      bounds: geoBounds(main) as [[number, number], [number, number]],
    };
    const prev = m.get(a2);
    if (!prev) {
      m.set(a2, geo);
      areas.set(a2, area);
      continue;
    }
    // Two map shapes for one country (Palestine): label from the bigger
    // shape, and frame the camera around both.
    const big = area > (areas.get(a2) ?? 0) ? geo : prev;
    m.set(a2, {
      anchor: big.anchor,
      bounds: [
        [Math.min(prev.bounds[0][0], geo.bounds[0][0]), Math.min(prev.bounds[0][1], geo.bounds[0][1])],
        [Math.max(prev.bounds[1][0], geo.bounds[1][0]), Math.max(prev.bounds[1][1], geo.bounds[1][1])],
      ],
    });
    areas.set(a2, Math.max(area, areas.get(a2) ?? 0));
  }
  for (const [code, pt] of Object.entries(MARKER_COUNTRIES)) {
    if (!m.has(code)) m.set(code, { anchor: pt, bounds: [pt, pt] });
  }
  // Seas and oceans are drawn as a labelled point
  for (const w of WATERS) m.set(w.code, { anchor: w.anchor, bounds: [w.anchor, w.anchor] });
  return m;
})();

export function hopEndpoints(a: string, b: string): [[number, number], [number, number]] | null {
  const ga = COUNTRY_GEO.get(a);
  const gb = COUNTRY_GEO.get(b);
  if (!ga || !gb) return null;
  return [ga.anchor, gb.anchor];
}

export const WORLD_VIEW: { center: [number, number]; zoom: number } = { center: [0, 0], zoom: 1 };

// Projected outline of the globe — the camera never shows past this
const [[SX0, SY0], [SX1, SY1]] = geoPath(projection).bounds({ type: "Sphere" });

/**
 * Keep a view inside the globe's edges so zooming to a far-north route
 * (Russia, Canada…) doesn't leave a band of empty space above the map.
 */
export function clampView(v: { center: [number, number]; zoom: number }, height = MAP_HEIGHT) {
  const xy = projection(v.center);
  if (!xy) return v;
  const halfW = MAP_WIDTH / (2 * v.zoom);
  const halfH = height / (2 * v.zoom);
  const clamp = (val: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, val)));
  const cx = clamp(xy[0], SX0 + halfW, SX1 - halfW);
  const cy = clamp(xy[1], SY0 + halfH, SY1 - halfH);
  const center = (projection.invert?.([cx, cy]) ?? v.center) as [number, number];
  return { center, zoom: v.zoom };
}

/**
 * Centre + zoom that frames all of `codes` inside the map with some padding.
 * `height` is the map frame's height in map units (taller on phones).
 */
export function fitView(
  codes: string[],
  maxZoom: number,
  height = MAP_HEIGHT
): { center: [number, number]; zoom: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const code of codes) {
    const g = COUNTRY_GEO.get(code);
    if (!g) continue;
    const [[w, s], [e, n]] = g.bounds;
    // Box that wraps the antimeridian (e.g. Russia's mainland): use the anchor only
    const pts: [number, number][] = e < w ? [g.anchor] : [[w, s], [e, n], [w, n], [e, s], g.anchor];
    for (const p of pts) {
      const xy = projection(p);
      if (!xy) continue;
      x0 = Math.min(x0, xy[0]); x1 = Math.max(x1, xy[0]);
      y0 = Math.min(y0, xy[1]); y1 = Math.max(y1, xy[1]);
    }
  }
  if (!isFinite(x0)) return WORLD_VIEW;

  // Never frame tighter than this, so small countries keep some context
  const MIN_SPAN = 70;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const dx = Math.max(x1 - x0, MIN_SPAN);
  const dy = Math.max(y1 - y0, MIN_SPAN * (height / MAP_WIDTH));

  const zoom = Math.max(1, Math.min(maxZoom, 0.8 * Math.min(MAP_WIDTH / dx, height / dy)));
  if (zoom < 1.15) return WORLD_VIEW;
  const center = (projection.invert?.([cx, cy]) ?? WORLD_VIEW.center) as [number, number];
  return clampView({ center, zoom }, height);
}
