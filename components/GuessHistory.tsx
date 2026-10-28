"use client";

import React, { useEffect, useRef } from "react";
import { Guess, GuessColor } from "@/lib/gameState";

interface GuessHistoryProps {
  guesses: Guess[];
  startName: string;
  endName: string;
  greenChain: string[];
}

const COLOR_STYLES: Record<GuessColor, { accent: string; label: string; char: string }> = {
  green:  { accent: "var(--accent)", label: "ON PATH",   char: "█" },
  orange: { accent: "var(--orange)", label: "DETOUR",    char: "▓" },
  grey:   { accent: "var(--sub)",    label: "OFF TRACK", char: "░" },
};

export default function GuessHistory({ guesses, startName, endName }: GuessHistoryProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll only the log itself — never yank the whole page down
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [guesses]);

  return (
    <div className="w-full log">
      <div className="log-row" style={{ color: "var(--text)" }}>
        <span className="log-num">00</span>
        <span style={{ color: "var(--text)" }}>◉</span>
        <span className="flex-1">{startName}</span>
        <span className="log-tag">START</span>
      </div>

      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {guesses.length === 0 && (
          <div className="log-row" style={{ color: "var(--sub)" }}>
            <span className="log-num">··</span>
            <span />
            <span className="flex-1">no guesses yet</span>
          </div>
        )}
        {guesses.map((g, i) => {
          const style = COLOR_STYLES[g.color] ?? COLOR_STYLES.grey;
          return (
            <div
              key={`${g.code}-${i}`}
              className="log-row fade-in"
              style={{
                borderLeft: `2px solid ${g.color === "green" ? style.accent : "transparent"}`,
                opacity: g.color === "grey" ? 0.7 : 1,
              }}
            >
              <span className="log-num">{String(i + 1).padStart(2, "0")}</span>
              <span style={{ color: style.accent }}>{style.char}</span>
              <span className="flex-1">
                {g.code.startsWith("~") && <span style={{ color: "var(--sub)" }}>≈ </span>}
                {g.name}
              </span>
              <span className="log-tag" style={{ color: style.accent }}>{style.label}</span>
            </div>
          );
        })}
      </div>

      <div className="log-row log-end">
        <span className="log-num">→</span>
        <span style={{ color: "var(--orange)" }}>◎</span>
        <span className="flex-1">{endName}</span>
        <span className="log-tag" style={{ color: "var(--orange)" }}>TARGET</span>
      </div>
    </div>
  );
}
