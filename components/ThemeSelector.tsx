"use client";

import React from "react";
import { themes } from "@/data/themes";
import { useSettings } from "@/components/SettingsProvider";

export default function ThemeSelector() {
  const { currentTheme, setTheme } = useSettings();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "6px",
        fontSize: "0.7rem",
      }}
    >
      {themes.map((t) => {
        const active = t.name === currentTheme;
        return (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            style={{
              background: t.bg,
              border: active
                ? `1px solid ${t.accent}`
                : `1px solid ${t.sub}`,
              color: t.text,
              cursor: "pointer",
              padding: "6px 5px 5px",
              textAlign: "left",
              fontFamily: "inherit",
              fontSize: "0.65rem",
              letterSpacing: "0.03em",
              outline: active ? `1px solid ${t.accent}` : "none",
              outlineOffset: "1px",
              transition: "border-color 0.1s",
            }}
          >
            {/* Theme name */}
            <div
              style={{
                color: active ? t.accent : t.text,
                marginBottom: "5px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: active ? "bold" : "normal",
              }}
            >
              {active ? `> ${t.name}` : `  ${t.name}`}
            </div>
            {/* Color swatch strip */}
            <div style={{ display: "flex", gap: "2px", height: "8px" }}>
              <div style={{ flex: 1, background: t.bg, border: `1px solid ${t.sub}` }} />
              <div style={{ flex: 1, background: t.bgAlt }} />
              <div style={{ flex: 1, background: t.accent }} />
              <div style={{ flex: 1, background: t.error }} />
              <div style={{ flex: 1, background: t.text, opacity: 0.8 }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
