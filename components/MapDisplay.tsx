"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { TOPO_NAME_TO_ALPHA2 } from "@/data/countryCodeMap";
import { Guess } from "@/lib/gameState";
import { useSettings } from "@/components/SettingsProvider";
import worldTopojson from "world-atlas/countries-110m.json";

interface MapDisplayProps {
  guesses: Guess[];
  startCode: string;
  endCode: string;
  status: "idle" | "playing" | "won" | "lost";
  optimalPath: string[];
  greenChain: string[];
}

// Microstates too small for 110m topojson — rendered as dot markers
const MICROSTATES: { code: string; label: string; coordinates: [number, number] }[] = [
  { code: "AD", label: "AD", coordinates: [1.52, 42.55] },
  { code: "MC", label: "MC", coordinates: [7.41, 43.73] },
  { code: "SM", label: "SM", coordinates: [12.46, 43.94] },
  { code: "VA", label: "VA", coordinates: [12.45, 41.90] },
  { code: "LI", label: "LI", coordinates: [9.56, 47.14] },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const DEFAULT_CENTER: [number, number] = [10, 10];

function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "#000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function MapDisplay({
  guesses,
  startCode,
  endCode,
  status,
  optimalPath,
  greenChain,
}: MapDisplayProps) {
  const { themeVersion } = useSettings();

  const [zoom,     setZoom]     = useState(1);
  const [center,   setCenter]   = useState<[number, number]>(DEFAULT_CENTER);
  const [winLit,   setWinLit]   = useState<Set<string>>(new Set());
  const [endPulse, setEndPulse] = useState(true);

  // Resolve theme colors whenever theme changes
  const colors = useMemo(() => ({
    bg:     getCSSVar("--bg"),
    bgAlt:  getCSSVar("--bg-alt"),
    text:   getCSSVar("--text"),
    sub:    getCSSVar("--sub"),
    accent: getCSSVar("--accent"),
    error:  getCSSVar("--error"),
    warn:   getCSSVar("--warn"),
  }), [themeVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived color constants from theme
  const FILL_DIM      = colors.bgAlt;
  const FILL_ACCENT   = colors.accent;
  const FILL_GREY     = colors.sub;
  const FILL_TEXT     = colors.text;
  const FILL_REVEAL   = colors.bg; // dim bg tint for lost-state optimal path
  const STROKE_DEF    = `${colors.sub}aa`;
  const STROKE_DIM    = `${colors.sub}44`;
  const STROKE_REVEAL = `${colors.accent}44`;

  // Win animation: sequential flash along greenChain
  useEffect(() => {
    if (status !== "won") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    greenChain.forEach((code, i) => {
      timers.push(setTimeout(() => setWinLit((p) => new Set(Array.from(p).concat(code))), i * 150));
      timers.push(setTimeout(() => {
        setWinLit((p) => { const n = new Set(p); n.delete(code); return n; });
      }, i * 150 + 400));
    });
    timers.push(setTimeout(() => setWinLit(new Set(greenChain)), greenChain.length * 150 + 450));
    return () => timers.forEach(clearTimeout);
  }, [status, greenChain]);

  // Pulse end-country border
  useEffect(() => {
    const id = setInterval(() => setEndPulse((p) => !p), 700);
    return () => clearInterval(id);
  }, []);

  // Guess color map (last status per country)
  const guessColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of guesses) {
      if (g.color === "green")       m.set(g.code, FILL_ACCENT);
      else if (g.color === "orange") m.set(g.code, colors.warn);
      else if (g.color === "grey")   m.set(g.code, FILL_GREY);
    }
    return m;
  }, [guesses, FILL_ACCENT, FILL_GREY, colors.warn]);

  const optimalSet = useMemo(() => new Set(optimalPath), [optimalPath]);

  const sw = parseFloat((1.2 / zoom).toFixed(3));

  function getStyle(a2: string | undefined): { fill: string; stroke: string; strokeWidth: number } {
    if (!a2) return { fill: FILL_DIM, stroke: STROKE_DIM, strokeWidth: sw };

    if (winLit.has(a2)) return { fill: FILL_TEXT, stroke: FILL_ACCENT, strokeWidth: sw * 1.5 };

    if (a2 === startCode) return { fill: FILL_TEXT, stroke: `${colors.text}bb`, strokeWidth: sw };

    if (a2 === endCode) {
      const guessedFill = guessColorMap.get(a2);
      return {
        fill: guessedFill ?? FILL_DIM,
        stroke: endPulse ? colors.warn : `${colors.warn}40`,
        strokeWidth: endPulse ? sw * 2.5 : sw,
      };
    }

    const gc = guessColorMap.get(a2);
    if (gc) return { fill: gc, stroke: STROKE_DIM, strokeWidth: sw };

    if (status === "lost" && optimalSet.has(a2)) {
      return { fill: FILL_REVEAL, stroke: STROKE_REVEAL, strokeWidth: sw * 1.5 };
    }

    return { fill: FILL_DIM, stroke: STROKE_DEF, strokeWidth: sw };
  }

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => {
      setCenter(pos.coordinates);
      setZoom(pos.zoom);
    },
    []
  );

  function zoomIn()  { setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z * 2).toFixed(2)))); }
  function zoomOut() { setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z / 2).toFixed(2)))); }
  function reset()   { setZoom(1); setCenter(DEFAULT_CENTER); }

  const btnBase: React.CSSProperties = {
    background: `${colors.bg}ee`,
    border: `1px solid ${colors.sub}`,
    color: colors.sub,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Zoom controls */}
      <div style={{ position: "absolute", top: 6, right: 6, zIndex: 10, display: "flex", gap: 4, alignItems: "center" }}>
        {zoom > 1 && (
          <button onClick={reset} style={{ ...btnBase, padding: "1px 6px", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
            RESET
          </button>
        )}
        <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} style={{ ...btnBase, color: zoom <= MIN_ZOOM ? `${colors.sub}44` : colors.sub, width: 22, height: 22, fontSize: "1rem", lineHeight: "1" }}>−</button>
        <span style={{ ...btnBase, padding: "1px 5px", fontSize: "0.65rem", minWidth: 32, textAlign: "center", cursor: "default" }}>
          {zoom.toFixed(1)}x
        </span>
        <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} style={{ ...btnBase, color: zoom >= MAX_ZOOM ? `${colors.sub}44` : colors.sub, width: 22, height: 22, fontSize: "1rem", lineHeight: "1" }}>+</button>
      </div>

      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155 }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <ZoomableGroup zoom={zoom} center={center} minZoom={MIN_ZOOM} maxZoom={MAX_ZOOM} onMoveEnd={handleMoveEnd}>
          <Geographies geography={worldTopojson as object}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const a2 = TOPO_NAME_TO_ALPHA2[geo.properties.name as string];
                const s  = getStyle(a2);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, outline: "none" },
                      hover:   { fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, outline: "none", cursor: "grab" },
                      pressed: { fill: s.fill, outline: "none", cursor: "grabbing" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Microstate dot markers */}
          {MICROSTATES.map(({ code, label, coordinates }) => {
            const s = getStyle(code);
            const r = Math.max(2, 5 / zoom);
            return (
              <Marker key={code} coordinates={coordinates}>
                <circle r={r} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />
                {zoom >= 3 && (
                  <text
                    textAnchor="middle"
                    y={-r - 2}
                    style={{ fontSize: 3 / zoom + "px", fill: s.fill, pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                )}
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, fontSize: "0.65rem", color: colors.sub, padding: "4px 2px 0", flexWrap: "wrap" }}>
        <span><span style={{ color: FILL_TEXT   }}>■</span> START</span>
        <span><span style={{ color: colors.warn      }}>■</span> TARGET</span>
        <span><span style={{ color: FILL_ACCENT }}>■</span> ON PATH</span>
        <span><span style={{ color: colors.warn      }}>■</span> DETOUR</span>
        <span><span style={{ color: FILL_GREY   }}>■</span> OFF TRACK</span>
        {status === "lost" && <span><span style={{ color: colors.accent }}>■</span> OPTIMAL PATH</span>}
        <span style={{ marginLeft: "auto", color: `${colors.sub}88` }}>DRAG TO PAN</span>
      </div>
    </div>
  );
}
