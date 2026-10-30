"use client";

import React from "react";
import { themes } from "@/data/themes";
import { useSettings } from "@/components/SettingsProvider";

/** Each chart style shown as a tiny printed swatch: sea, land, ink, route. */
export default function ThemeSelector() {
  const { currentTheme, setTheme } = useSettings();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 10 }}>
      {themes.map((t) => {
        const active = t.name === currentTheme;
        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            aria-pressed={active}
            style={{
              background: t.bg,
              color: t.text,
              border: `${active ? 1.5 : 0.75}px solid ${active ? t.warn : t.sub}`,
              outline: active ? `0.75px solid ${t.warn}` : "none",
              outlineOffset: 2,
              padding: 6,
              cursor: "pointer",
              textAlign: "center",
              borderRadius: 2,
            }}
          >
            <svg viewBox="0 0 100 46" width="100%" style={{ display: "block", border: `0.75px solid ${t.text}` }} aria-hidden>
              <rect width="100" height="46" fill={t.sea} />
              <path d="M8 34 C14 18 30 10 42 16 C50 20 46 32 56 34 C66 36 70 22 82 20 C90 19 94 28 92 38 L8 40 Z" fill={t.land} stroke={t.text} strokeWidth="0.8" />
              <path d="M22 30 Q 45 12 76 26" fill="none" stroke={t.accent} strokeWidth="1.4" strokeDasharray="3 2" />
              <circle cx="22" cy="30" r="2.2" fill={t.text} />
              <circle cx="76" cy="26" r="2.6" fill={t.warn} />
            </svg>
            <div
              style={{
                fontFamily: "var(--caps)",
                letterSpacing: "0.08em",
                fontSize: "0.82rem",
                marginTop: 5,
                textTransform: "lowercase",
              }}
            >
              {t.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}
