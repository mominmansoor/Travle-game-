"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  Sphere,
  ZoomableGroup,
} from "react-simple-maps";
import { TOPO_NAME_TO_ALPHA2 } from "@/data/countryCodeMap";
import { nodeName, isWater } from "@/data/nodes";
import { WATERS } from "@/data/waters";
import {
  COUNTRY_GEO,
  MAP_HEIGHT,
  MAP_SCALE,
  MAP_WIDTH,
  MARKER_COUNTRIES,
  WORLD_VIEW,
  clampView,
  fitView,
  hopEndpoints,
} from "@/data/mapGeo";
import { Guess } from "@/lib/gameState";
import { connectedComponent, getNeighbors } from "@/lib/bfs";
import { useSettings } from "@/components/SettingsProvider";
import worldTopojson from "world-atlas/countries-110m.json";

interface MapDisplayProps {
  guesses: Guess[];
  startCode: string;
  endCode: string;
  status: "idle" | "playing" | "won" | "lost";
  optimalPath: string[];
  greenChain: string[];
  ocean?: boolean;
}

type View = { center: [number, number]; zoom: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 10;
const AUTO_FIT_MAX = 6;
const TWEEN_MS = 650;

function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "#000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Plain scroll keeps scrolling the page; ctrl/⌘ + scroll (or a trackpad
 * pinch, which arrives as ctrl+wheel) zooms. Drags still pan.
 * Defined once at module level: react-simple-maps re-binds d3-zoom
 * whenever this function's identity changes.
 * (Typed loosely — the library's types say SVGElement, but at runtime
 * it's handed the DOM event.)
 */
const zoomFilter = ((e: MouseEvent | WheelEvent | TouchEvent) => {
  if (!e) return false;
  if (e.type === "wheel") return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey;
  return !("button" in e) || !(e as MouseEvent).button;
}) as unknown as (element: SVGElement) => boolean;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const nameOf = nodeName;

export default function MapDisplay({
  guesses,
  startCode,
  endCode,
  status,
  optimalPath,
  greenChain,
  ocean = false,
}: MapDisplayProps) {
  const { themeVersion } = useSettings();

  const [view, setView] = useState<View>(WORLD_VIEW);
  const [winLit, setWinLit] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);
  const [follow, setFollow] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<number | null>(null);
  const viewRef = useRef<View>(WORLD_VIEW);
  viewRef.current = view;

  // SVG units per screen pixel — keeps labels and dots readable on phones,
  // where the 800-unit-wide map is squeezed into ~360px.
  const [px, setPx] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPx(Math.min(2.4, Math.max(0.6, MAP_WIDTH / (el.clientWidth || MAP_WIDTH)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Camera ───────────────────────────────────────────────────────────────
  const animateTo = useCallback((rawTarget: View) => {
    if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
    const target = clampView(rawTarget);
    const from = viewRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / TWEEN_MS);
      const k = ease(t);
      setView({
        center: [
          from.center[0] + (target.center[0] - from.center[0]) * k,
          from.center[1] + (target.center[1] - from.center[1]) * k,
        ],
        zoom: from.zoom + (target.zoom - from.zoom) * k,
      });
      tweenRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    tweenRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => {
    if (tweenRef.current) cancelAnimationFrame(tweenRef.current);
  }, []);

  const routeCodes = useMemo(
    () => [startCode, endCode, ...guesses.map((g) => g.code)],
    [startCode, endCode, guesses]
  );

  const fitRoute = useCallback(() => {
    setFollow(true);
    animateTo(fitView(routeCodes, AUTO_FIT_MAX));
  }, [routeCodes, animateTo]);

  // Frame the route on load and after every guess (unless the player has
  // taken the camera themselves — FIT hands it back).
  useEffect(() => {
    if (follow) animateTo(fitView(routeCodes, AUTO_FIT_MAX));
  }, [routeCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMoveStart = useCallback(() => {
    if (tweenRef.current) {
      cancelAnimationFrame(tweenRef.current);
      tweenRef.current = null;
    }
  }, []);

  const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
    const prev = viewRef.current;
    const moved =
      Math.abs(pos.zoom - prev.zoom) > 0.01 ||
      Math.abs(pos.coordinates[0] - prev.center[0]) > 0.5 ||
      Math.abs(pos.coordinates[1] - prev.center[1]) > 0.5;
    if (moved) setFollow(false);
    setView({ center: pos.coordinates, zoom: pos.zoom });
  }, []);

  function zoomBy(f: number) {
    setFollow(false);
    const z = viewRef.current.zoom;
    animateTo({ center: viewRef.current.center, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * f)) });
  }

  // ── Win animation: light the chain up one country at a time ─────────────
  useEffect(() => {
    if (status !== "won") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    greenChain.forEach((code, i) => {
      timers.push(setTimeout(() => setWinLit((p) => new Set(Array.from(p).concat(code))), i * 140));
    });
    return () => timers.forEach(clearTimeout);
  }, [status, greenChain]);

  // ── Palette ──────────────────────────────────────────────────────────────
  const colors = useMemo(
    () => ({
      paper: getCSSVar("--paper"),
      ink: getCSSVar("--ink"),
      sub: getCSSVar("--sub"),
      accent: getCSSVar("--accent"),
      warn: getCSSVar("--warn"),
      hi: getCSSVar("--hi"),
      shadow: getCSSVar("--shadow"),
    }),
    [themeVersion] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Per-country styling ──────────────────────────────────────────────────
  // States are told apart by pattern as much as colour: solid, stripes, dither.
  const guessFill = useMemo(() => {
    const m = new Map<string, { fill: string; ink: string }>();
    for (const g of guesses) {
      if (g.color === "green") m.set(g.code, { fill: colors.accent, ink: colors.accent });
      else if (g.color === "orange") m.set(g.code, { fill: "url(#tv-detour)", ink: colors.warn });
      else m.set(g.code, { fill: "url(#tv-adrift)", ink: colors.sub });
    }
    return m;
  }, [guesses, colors]);

  const optimalSet = useMemo(() => new Set(optimalPath), [optimalPath]);
  const gameOver = status === "won" || status === "lost";

  /** Countries whose names may be shown on hover */
  const revealed = useCallback(
    (code: string) => gameOver || code === startCode || code === endCode || guessFill.has(code),
    [gameOver, startCode, endCode, guessFill]
  );

  const styleFor = useCallback(
    (a2: string | undefined): { fill: string; stroke: string; strokeWidth: number; className?: string } => {
      const base = { fill: colors.paper, stroke: colors.ink, strokeWidth: 0.75 };
      if (!a2) return base;
      if (winLit.has(a2)) return { fill: colors.accent, stroke: colors.ink, strokeWidth: 1.6 };
      if (a2 === startCode) return { fill: colors.ink, stroke: colors.ink, strokeWidth: 1.6 };
      if (a2 === endCode) return { fill: "url(#tv-end)", stroke: colors.ink, strokeWidth: 2, className: "map-pulse" };
      const g = guessFill.get(a2);
      if (g) return { fill: g.fill, stroke: colors.ink, strokeWidth: 1.4 };
      if (status === "lost" && optimalSet.has(a2)) return { fill: "url(#tv-best)", stroke: colors.ink, strokeWidth: 1.6 };
      return base;
    },
    [colors, winLit, startCode, endCode, guessFill, status, optimalSet]
  );

  // Pointer → tooltip position inside the wrapper
  const trackPointer = useCallback(
    (code: string | undefined, e: React.MouseEvent) => {
      if (!code || !revealed(code) || !wrapRef.current) {
        setHover(null);
        return;
      }
      const r = wrapRef.current.getBoundingClientRect();
      setHover({ code, x: e.clientX - r.left, y: e.clientY - r.top });
    },
    [revealed]
  );

  // The country layer doesn't depend on zoom (strokes are non-scaling and the
  // patterns it points at live in <defs>), so it's memoised.
  const countryLayer = useMemo(
    () => (
      <Geographies geography={worldTopojson as object}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const a2 = TOPO_NAME_TO_ALPHA2[geo.properties.name as string];
            const s = styleFor(a2);
            const shared = {
              fill: s.fill,
              stroke: s.stroke,
              strokeWidth: s.strokeWidth,
              strokeLinejoin: "round" as const,
              outline: "none",
              vectorEffect: "non-scaling-stroke" as const,
            };
            const canHover = a2 && revealed(a2);
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                className={s.className}
                onMouseMove={(e: React.MouseEvent) => trackPointer(a2, e)}
                onMouseLeave={() => setHover(null)}
                style={{
                  default: shared,
                  hover: { ...shared, strokeWidth: canHover ? 2.4 : s.strokeWidth },
                  pressed: shared,
                }}
              />
            );
          })
        }
      </Geographies>
    ),
    [styleFor, revealed, trackPointer]
  );

  // ── Route network: every border between countries you've linked up ───────
  const linked = useMemo(() => {
    const set = connectedComponent(guesses.map((g) => g.code), startCode, endCode, ocean);
    if (status === "won") set.add(endCode);
    return Array.from(set);
  }, [guesses, startCode, endCode, ocean, status]);

  const hops = useMemo(() => {
    const out: { key: string; from: [number, number]; to: [number, number]; sea: boolean }[] = [];
    for (let i = 0; i < linked.length; i++) {
      for (let j = i + 1; j < linked.length; j++) {
        const a = linked[i];
        const b = linked[j];
        if (!getNeighbors(a, ocean).includes(b)) continue;
        const ends = hopEndpoints(a, b);
        if (!ends) continue;
        out.push({ key: `${a}-${b}`, from: ends[0], to: ends[1], sea: isWater(a) || isWater(b) });
      }
    }
    return out;
  }, [linked, ocean]);

  const z = view.zoom;
  const u = px / z; // one screen pixel, in map units at the current zoom
  const dot = 2 * u; // one "pixel" of the dither patterns
  const startGeo = COUNTRY_GEO.get(startCode);
  const endGeo = COUNTRY_GEO.get(endCode);
  const crisp = { shapeRendering: "crispEdges" } as React.CSSProperties;
  const noHit = { pointerEvents: "none" } as React.CSSProperties;

  return (
    <div>
      <div ref={wrapRef} className="map-screen dither-sea">
        <div className="map-controls">
          <button onClick={fitRoute} className={follow ? "on" : ""} title="Frame the route">fit</button>
          <button onClick={() => { setFollow(false); animateTo(WORLD_VIEW); }} title="Whole world">world</button>
          <button onClick={() => zoomBy(0.5)} disabled={z <= MIN_ZOOM + 0.01} aria-label="Zoom out">−</button>
          <button onClick={() => zoomBy(2)} disabled={z >= MAX_ZOOM - 0.01} aria-label="Zoom in">+</button>
        </div>

        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: MAP_SCALE }}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            {/* sizes follow the zoom so a dither "pixel" is always 2 screen pixels */}
            <pattern id="tv-adrift" patternUnits="userSpaceOnUse" width={dot * 2} height={dot * 2}>
              <rect width={dot * 2} height={dot * 2} fill={colors.paper} style={crisp} />
              <rect width={dot} height={dot} fill={colors.ink} style={crisp} />
            </pattern>
            <pattern id="tv-end" patternUnits="userSpaceOnUse" width={dot * 2} height={dot * 2}>
              <rect width={dot * 2} height={dot * 2} fill={colors.paper} style={crisp} />
              <rect width={dot} height={dot} fill={colors.warn} style={crisp} />
              <rect x={dot} y={dot} width={dot} height={dot} fill={colors.warn} style={crisp} />
            </pattern>
            <pattern id="tv-detour" patternUnits="userSpaceOnUse" width={dot * 2.5} height={dot * 2.5} patternTransform="rotate(45)">
              <rect width={dot * 2.5} height={dot * 2.5} fill={colors.paper} />
              <rect width={dot * 1.25} height={dot * 2.5} fill={colors.warn} />
            </pattern>
            <pattern id="tv-best" patternUnits="userSpaceOnUse" width={dot * 2.5} height={dot * 2.5} patternTransform="rotate(-45)">
              <rect width={dot * 2.5} height={dot * 2.5} fill={colors.paper} />
              <rect width={dot * 1.25} height={dot * 2.5} fill={colors.accent} />
            </pattern>
          </defs>
          <ZoomableGroup
            zoom={view.zoom}
            center={view.center}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onMoveStart={handleMoveStart}
            onMoveEnd={handleMoveEnd}
            filterZoomEvent={zoomFilter}
          >
            <Sphere id="tv-sphere" fill="none" stroke={colors.ink} strokeWidth={1.4} style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties} />

            {countryLayer}

            {/* Route: paper casing, then a solid ink line (dashed across water) */}
            {hops.map((h) => (
              <Line key={`${h.key}-case`} from={h.from} to={h.to} stroke={colors.paper} strokeWidth={6} strokeLinecap="square"
                style={{ vectorEffect: "non-scaling-stroke", ...noHit } as React.CSSProperties} />
            ))}
            {hops.map((h) => (
              <Line key={h.key} from={h.from} to={h.to} stroke={colors.ink} strokeWidth={2.5} strokeLinecap="square"
                strokeDasharray={h.sea ? "3 5" : undefined}
                style={{ vectorEffect: "non-scaling-stroke", ...noHit } as React.CSSProperties} />
            ))}
            {linked.map((code) => {
              const g = COUNTRY_GEO.get(code);
              if (!g || isWater(code)) return null;
              return (
                <Marker key={`node-${code}`} coordinates={g.anchor} style={{ default: noHit }}>
                  <rect x={-4 * u} y={-4 * u} width={8 * u} height={8 * u} fill={colors.paper} stroke={colors.ink} strokeWidth={2.2 * u} style={crisp} />
                </Marker>
              );
            })}

            {/* Small countries the 110m map can't draw get a square */}
            {Object.entries(MARKER_COUNTRIES).map(([code, coordinates]) => {
              const s = styleFor(code);
              const plain = s.fill === colors.paper;
              const r = (plain ? 2.6 : 4) * u;
              const fill = s.fill.startsWith("url(") ? guessFill.get(code)?.ink ?? colors.warn : s.fill;
              return (
                <Marker key={code} coordinates={coordinates}
                  onMouseMove={(e: React.MouseEvent) => trackPointer(code, e)}
                  onMouseLeave={() => setHover(null)}>
                  <rect x={-r} y={-r} width={r * 2} height={r * 2} className={s.className}
                    fill={plain ? colors.paper : fill} stroke={colors.ink} strokeWidth={1.6 * u} style={crisp} />
                </Marker>
              );
            })}

            {/* Seas and oceans: a faint ≈ until you name one, then a label */}
            {ocean &&
              WATERS.map((w) => {
                const named = guessFill.has(w.code) || winLit.has(w.code) || (status === "lost" && optimalSet.has(w.code));
                const color = winLit.has(w.code) ? colors.ink : guessFill.get(w.code)?.ink ?? (named ? colors.ink : colors.sub);
                return (
                  <Marker key={w.code} coordinates={w.anchor}
                    onMouseMove={(e: React.MouseEvent) => trackPointer(w.code, e)}
                    onMouseLeave={() => setHover(null)}>
                    <text className="map-label" textAnchor="middle" dominantBaseline="central"
                      style={{ fontSize: (named ? 18 : 14) * u, fill: color, stroke: colors.paper, strokeWidth: 3 * u, paintOrder: "stroke", cursor: "default" }}>
                      ≈
                    </text>
                    {named && (
                      <text className="map-label" y={14 * u} textAnchor="middle"
                        style={{ fontSize: 11 * u, fill: colors.ink, stroke: colors.paper, strokeWidth: 3.5 * u, paintOrder: "stroke" }}>
                        {w.name}
                      </text>
                    )}
                  </Marker>
                );
              })}

            {/* Start flag and destination pin, each with a little name tag */}
            {startGeo && (
              <Marker key={`start-${startCode}`} coordinates={startGeo.anchor} style={{ default: noHit }}>
                <PixelSprite art={FLAG} anchor={[0, 13]} scale={2 * u} palette={{ X: colors.ink, F: colors.hi }} haloColor={colors.paper} />
                <NameTag text={nameOf(startCode)} x={20 * u} y={-26 * u} u={u} colors={colors} />
              </Marker>
            )}
            {endGeo && (
              <Marker key={`end-${endCode}`} coordinates={endGeo.anchor} style={{ default: noHit }}>
                <PixelSprite art={PIN} anchor={[4, 13]} scale={2 * u} palette={{ X: colors.ink, W: colors.warn, O: colors.paper }} haloColor={colors.paper} delay={120} />
                <NameTag text={nameOf(endCode)} x={12 * u} y={-28 * u} u={u} colors={colors} accent={colors.warn} />
              </Marker>
            )}
          </ZoomableGroup>
        </ComposableMap>

        {hover && (
          <div
            className="map-tooltip"
            style={{
              left: Math.min(hover.x + 14, (wrapRef.current?.clientWidth ?? 0) - 160),
              top: hover.y + 16,
            }}
          >
            {nameOf(hover.code)}
            {hover.code === startCode && <span className="tag"> · start</span>}
            {hover.code === endCode && <span className="tag"> · destination</span>}
          </div>
        )}
      </div>

      <div className="map-legend">
        <span><i className="sw-start" /> start</span>
        <span><i className="sw-end" /> destination</span>
        <span><i className="sw-on" /> on course</span>
        <span><i className="sw-detour" /> detour</span>
        <span><i className="sw-adrift" /> adrift</span>
        {status === "lost" && <span><i style={{ background: "repeating-linear-gradient(-45deg, var(--accent) 0 2px, var(--paper) 2px 4px)" }} /> best route</span>}
        <span className="hint">drag · ctrl+scroll to zoom</span>
      </div>
    </div>
  );
}

// ── Pixel art ────────────────────────────────────────────────────────────────
// One character per pixel. "." is transparent; other letters map to colours.

const PIN = [
  "..XXXXX..",
  ".XWWWWWX.",
  "XWWWWWWWX",
  "XWWXXXWWX",
  "XWWXOXWWX",
  "XWWXXXWWX",
  "XWWWWWWWX",
  ".XWWWWWX.",
  ".XWWWWWX.",
  "..XWWWX..",
  "...XWX...",
  "...XWX...",
  "....X....",
];

const FLAG = [
  "XXXXXXXXX.",
  "XFFFFFFFFX",
  "XFFFFFFFX.",
  "XFFFFFFFFX",
  "XXXXXXXXX.",
  "XX........",
  "XX........",
  "XX........",
  "XX........",
  "XX........",
  "XX........",
  "XX........",
  "XX........",
];

function PixelSprite({
  art,
  anchor,
  scale,
  palette,
  delay = 0,
  haloColor,
}: {
  art: string[];
  anchor: [number, number];
  scale: number;
  palette: Record<string, string>;
  delay?: number;
  haloColor: string;
}) {
  const rects: React.ReactNode[] = [];
  const halo: React.ReactNode[] = [];
  art.forEach((row, y) => {
    // merge runs of the same colour into one rect so edges stay seamless
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w++;
      if (c !== "." && palette[c]) {
        rects.push(<rect key={`${x}-${y}`} x={x - anchor[0]} y={y - anchor[1]} width={w} height={1.04} fill={palette[c]} />);
        // a one-pixel paper outline so the sprite reads on any fill, even its own colour
        halo.push(<rect key={`h${x}-${y}`} x={x - anchor[0] - 1} y={y - anchor[1] - 1} width={w + 2} height={3} fill={haloColor} />);
      }
      x += w;
    }
  });
  return (
    <g transform={`scale(${scale})`} shapeRendering="crispEdges">
      <g className="pin-drop" style={{ animationDelay: `${delay}ms` }}>
        {halo}
        {rects}
      </g>
    </g>
  );
}

function NameTag({
  text,
  x,
  y,
  u,
  colors,
  accent,
}: {
  text: string;
  x: number;
  y: number;
  u: number;
  colors: { paper: string; ink: string; shadow: string };
  accent?: string;
}) {
  const fs = 12 * u;
  const tw = text.length * fs * 0.56;
  const padX = 6 * u;
  const h = fs + 8 * u;
  const w = tw + padX * 2;
  return (
    <g style={{ pointerEvents: "none" }} shapeRendering="crispEdges">
      <rect x={x + 2.5 * u} y={y + 2.5 * u} width={w} height={h} rx={2 * u} fill={colors.shadow} />
      <rect x={x} y={y} width={w} height={h} rx={2 * u} fill={colors.paper} stroke={colors.ink} strokeWidth={2 * u} />
      {accent && <rect x={x} y={y + h - 3 * u} width={w} height={2 * u} fill={accent} />}
      <text
        className="map-label"
        x={x + padX}
        y={y + h / 2}
        dominantBaseline="central"
        textLength={tw}
        lengthAdjust="spacingAndGlyphs"
        style={{ fontSize: fs, fill: colors.ink }}
      >
        {text}
      </text>
    </g>
  );
}
