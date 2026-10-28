"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Line,
  Marker,
  Sphere,
  ZoomableGroup,
} from "react-simple-maps";
import { TOPO_NAME_TO_ALPHA2 } from "@/data/countryCodeMap";
import { COUNTRY_MAP } from "@/data/countries";
import { isSeaLink } from "@/data/seaLinks";
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

function nameOf(code: string) {
  return COUNTRY_MAP.get(code)?.name ?? code;
}

export default function MapDisplay({
  guesses,
  startCode,
  endCode,
  status,
  optimalPath,
  greenChain,
  ocean = false,
}: MapDisplayProps) {
  const { themeVersion, settings } = useSettings();

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
    const ro = new ResizeObserver(() => setPx(Math.min(2.4, Math.max(1, MAP_WIDTH / (el.clientWidth || MAP_WIDTH)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Theme colours ────────────────────────────────────────────────────────
  const colors = useMemo(
    () => ({
      bg: getCSSVar("--bg"),
      bgAlt: getCSSVar("--bg-alt"),
      text: getCSSVar("--text"),
      sub: getCSSVar("--sub"),
      accent: getCSSVar("--accent"),
      error: getCSSVar("--error"),
      warn: getCSSVar("--warn"),
    }),
    // greenText swaps --text/--sub on <body>, so re-read when it flips
    [themeVersion, settings.greenText] // eslint-disable-line react-hooks/exhaustive-deps
  );

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

  // ── Per-country styling ──────────────────────────────────────────────────
  const guessColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of guesses) {
      m.set(g.code, g.color === "green" ? colors.accent : g.color === "orange" ? colors.warn : colors.sub);
    }
    return m;
  }, [guesses, colors]);

  const optimalSet = useMemo(() => new Set(optimalPath), [optimalPath]);
  const gameOver = status === "won" || status === "lost";

  /** Countries whose names may be shown on hover */
  const revealed = useCallback(
    (code: string) => gameOver || code === startCode || code === endCode || guessColorMap.has(code),
    [gameOver, startCode, endCode, guessColorMap]
  );

  const styleFor = useCallback(
    (a2: string | undefined): { fill: string; stroke: string; strokeWidth: number; className?: string } => {
      const base = { fill: colors.bgAlt, stroke: `${colors.sub}aa`, strokeWidth: 0.6 };
      if (!a2) return { ...base, stroke: `${colors.sub}55` };
      if (winLit.has(a2)) return { fill: colors.accent, stroke: colors.text, strokeWidth: 1.2 };
      if (a2 === startCode) return { fill: colors.text, stroke: colors.text, strokeWidth: 1 };
      if (a2 === endCode) {
        return { fill: "url(#travle-target-hatch)", stroke: colors.warn, strokeWidth: 1.8, className: "map-pulse" };
      }
      const gc = guessColorMap.get(a2);
      if (gc) return { fill: gc, stroke: colors.bg, strokeWidth: 0.6 };
      if (status === "lost" && optimalSet.has(a2)) {
        return { fill: `${colors.accent}40`, stroke: colors.accent, strokeWidth: 1.2 };
      }
      return base;
    },
    [colors, winLit, startCode, endCode, guessColorMap, status, optimalSet]
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

  // The country layer doesn't depend on zoom (strokes are non-scaling),
  // so it's memoised and skipped while the camera animates.
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
              outline: "none",
              vectorEffect: "non-scaling-stroke" as const,
              transition: "fill 250ms ease",
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
                  hover: { ...shared, stroke: canHover ? colors.text : s.stroke, strokeWidth: canHover ? 1.4 : s.strokeWidth },
                  pressed: { ...shared },
                }}
              />
            );
          })
        }
      </Geographies>
    ),
    [styleFor, revealed, trackPointer, colors]
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
        const land = COUNTRY_MAP.get(a)?.neighbors.includes(b) ?? false;
        out.push({ key: `${a}-${b}`, from: ends[0], to: ends[1], sea: !land && isSeaLink(a, b) });
      }
    }
    return out;
  }, [linked, ocean]);

  const z = view.zoom;
  const u = px / z; // one screen pixel, in map units at the current zoom
  const labelSize = 11 * u;
  const startGeo = COUNTRY_GEO.get(startCode);
  const endGeo = COUNTRY_GEO.get(endCode);

  const btn: React.CSSProperties = {
    background: `${colors.bg}e6`,
    border: `1px solid ${colors.sub}`,
    color: colors.text,
    fontFamily: "inherit",
    cursor: "pointer",
    height: 26,
    minWidth: 26,
    padding: "0 7px",
    fontSize: "0.75rem",
    lineHeight: 1,
  };

  return (
    <div ref={wrapRef} style={{ width: "100%", position: "relative" }}>
      {/* Controls */}
      <div className="map-controls">
        <button onClick={fitRoute} style={{ ...btn, color: follow ? colors.accent : colors.text }} title="Frame the route">
          FIT
        </button>
        <button onClick={() => { setFollow(false); animateTo(WORLD_VIEW); }} style={btn} title="Whole world">
          WORLD
        </button>
        <button onClick={() => zoomBy(0.5)} disabled={z <= MIN_ZOOM + 0.01} style={btn} aria-label="Zoom out">−</button>
        <button onClick={() => zoomBy(2)} disabled={z >= MAX_ZOOM - 0.01} style={btn} aria-label="Zoom in">+</button>
      </div>

      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: MAP_SCALE }}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        style={{ width: "100%", height: "auto", display: "block", background: colors.bg }}
      >
        <defs>
          <pattern id="travle-target-hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <rect width="4" height="4" fill={`${colors.warn}33`} />
            <line x1="0" y1="0" x2="0" y2="4" stroke={colors.warn} strokeWidth="1.6" />
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
          <Sphere id="travle-sphere" fill={colors.bg} stroke={`${colors.sub}66`} strokeWidth={0.6} />
          <Graticule stroke={`${colors.sub}26`} strokeWidth={0.5} style={{ vectorEffect: "non-scaling-stroke" } as React.CSSProperties} />

          {countryLayer}

          {/* Route lines: dark casing underneath so they read on any fill */}
          {hops.map((h) => (
            <Line
              key={`${h.key}-case`}
              from={h.from}
              to={h.to}
              stroke={colors.bg}
              strokeWidth={4}
              strokeOpacity={0.7}
              strokeLinecap="round"
              style={{ vectorEffect: "non-scaling-stroke", pointerEvents: "none" } as React.CSSProperties}
            />
          ))}
          {hops.map((h) => (
            <Line
              key={h.key}
              from={h.from}
              to={h.to}
              stroke={colors.text}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeDasharray={h.sea ? "3 4" : undefined}
              style={{ vectorEffect: "non-scaling-stroke", pointerEvents: "none" } as React.CSSProperties}
            />
          ))}
          {linked.map((code) => {
            const g = COUNTRY_GEO.get(code);
            if (!g) return null;
            return (
              <Marker key={`node-${code}`} coordinates={g.anchor} style={{ default: { pointerEvents: "none" } }}>
                <circle r={2.8 * u} fill={colors.text} stroke={colors.bg} strokeWidth={1.2 * u} />
              </Marker>
            );
          })}

          {/* Small countries the 110m map can't draw */}
          {Object.entries(MARKER_COUNTRIES).map(([code, coordinates]) => {
            const s = styleFor(code);
            const plain = s.fill === colors.bgAlt;
            const r = (plain ? 2.4 : 3.6) * u;
            const fill = s.fill.startsWith("url(") ? `${colors.warn}88` : s.fill;
            return (
              <Marker
                key={code}
                coordinates={coordinates}
                onMouseMove={(e: React.MouseEvent) => trackPointer(code, e)}
                onMouseLeave={() => setHover(null)}
              >
                <circle
                  r={r}
                  className={s.className}
                  fill={plain ? "none" : fill}
                  stroke={plain ? `${colors.sub}` : s.stroke}
                  strokeWidth={(plain ? 0.8 : 1.2) * u}
                />
              </Marker>
            );
          })}

          {/* Start / target labels */}
          {startGeo && (
            <Marker coordinates={startGeo.anchor} style={{ default: { pointerEvents: "none" } }}>
              <text className="map-label" y={-9 * u} textAnchor="middle" style={{ fontSize: labelSize, fill: colors.text, stroke: colors.bg, strokeWidth: 3 * u }}>
                {nameOf(startCode)}
              </text>
            </Marker>
          )}
          {endGeo && (
            <Marker coordinates={endGeo.anchor} style={{ default: { pointerEvents: "none" } }}>
              <text className="map-label" y={-9 * u} textAnchor="middle" style={{ fontSize: labelSize, fill: colors.warn, stroke: colors.bg, strokeWidth: 3 * u }}>
                ◎ {nameOf(endCode)}
              </text>
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="map-tooltip"
          style={{
            left: Math.min(hover.x + 12, (wrapRef.current?.clientWidth ?? 0) - 150),
            top: hover.y + 14,
            borderColor: guessColorMap.get(hover.code) ?? (hover.code === endCode ? colors.warn : colors.sub),
          }}
        >
          {nameOf(hover.code)}
          {hover.code === startCode && <span style={{ color: colors.sub }}> · start</span>}
          {hover.code === endCode && <span style={{ color: colors.warn }}> · target</span>}
        </div>
      )}

      {/* Legend */}
      <div className="map-legend" style={{ color: colors.sub }}>
        <span><i style={{ background: colors.text }} /> START</span>
        <span><i className="hatch" /> TARGET</span>
        <span><i style={{ background: colors.accent }} /> ON PATH</span>
        <span><i style={{ background: colors.warn }} /> DETOUR</span>
        <span><i style={{ background: colors.sub }} /> OFF TRACK</span>
        <span><b style={{ color: colors.text }}>─</b> LINKED</span>
        {ocean && <span><b style={{ color: colors.text }}>╌</b> SEA HOP</span>}
        {status === "lost" && <span><i style={{ background: `${colors.accent}40`, outline: `1px solid ${colors.accent}` }} /> BEST ROUTE</span>}
        <span className="map-hint">DRAG · CTRL+SCROLL / PINCH TO ZOOM</span>
      </div>
    </div>
  );
}
