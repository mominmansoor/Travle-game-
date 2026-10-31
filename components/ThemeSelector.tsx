"use client";

import React from "react";
import { themes } from "@/data/themes";
import { useSettings } from "@/components/SettingsProvider";

/** Each palette as a tiny desktop: wallpaper, a window with its shadow, and a scrap of map. */
export default function ThemeSelector() {
  const { currentTheme, setTheme } = useSettings();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
      {themes.map((t) => {
        const active = t.name === currentTheme;
        const pid = `sea-${t.name.replace(/\W+/g, "-")}`;
        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            aria-pressed={active}
            style={{
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "var(--ink)",
            }}
          >
            <svg
              viewBox="0 0 150 96"
              width="100%"
              style={{
                display: "block",
                borderRadius: 8,
                border: "2.5px solid var(--ink)",
                boxShadow: active ? "4px 4px 0 var(--shadow)" : "none",
                outline: active ? "2.5px solid var(--ink)" : "none",
                outlineOffset: 3,
              }}
              shapeRendering="crispEdges"
              aria-hidden
            >
              <defs>
                <pattern id={pid} width="4" height="4" patternUnits="userSpaceOnUse">
                  <rect width="4" height="4" fill={t.paper} />
                  <rect x="3" y="3" width="1" height="1" fill={t.sub} />
                </pattern>
              </defs>
              <rect width="150" height="96" fill={t.desk} />
              <rect x="22" y="18" width="112" height="68" rx="5" fill={t.shadow} />
              <rect x="16" y="12" width="112" height="68" rx="5" fill={t.paper} stroke={t.ink} strokeWidth="2" />
              <line x1="16" y1="24" x2="128" y2="24" stroke={t.ink} strokeWidth="2" />
              <circle cx="24" cy="18" r="2.6" fill={t.ink} />
              <circle cx="31" cy="18" r="2.6" fill="none" stroke={t.ink} strokeWidth="1.4" />
              <rect x="17" y="25" width="110" height="54" fill={`url(#${pid})`} />
              <path d="M30 70 L36 40 L58 34 L66 48 L84 44 L96 58 L110 52 L118 70 Z" fill={t.paper} stroke={t.ink} strokeWidth="1.6" />
              <path d="M58 34 L66 48 L52 56 L44 44 Z" fill={t.accent} stroke={t.ink} strokeWidth="1.6" />
              <rect x="98" y="46" width="6" height="8" fill={t.warn} stroke={t.ink} strokeWidth="1.2" />
            </svg>
            <div className="pixel" style={{ marginTop: 8, fontSize: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
              {active ? "▶" : ""} {t.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
