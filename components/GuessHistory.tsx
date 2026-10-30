"use client";

import React, { useEffect, useRef } from "react";
import { Guess, GuessColor } from "@/lib/gameState";

interface GuessHistoryProps {
  guesses: Guess[];
  startName: string;
  endName: string;
  greenChain: string[];
}

const COLOR_STYLES: Record<GuessColor, { ink: string; label: string; dot: string }> = {
  green:  { ink: "var(--accent)", label: "on course", dot: "●" },
  orange: { ink: "var(--warn)",   label: "detour",    dot: "◐" },
  grey:   { ink: "var(--sub)",    label: "adrift",    dot: "○" },
};

export default function GuessHistory({ guesses, startName, endName }: GuessHistoryProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll only the log itself — never yank the whole page down
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [guesses]);

  return (
    <div className="w-full">
      <div className="log-row log-start">
        <span className="log-num" />
        <span className="log-dot">⚑</span>
        <span className="log-name">{startName}</span>
        <span className="log-tag">set out</span>
      </div>

      <div ref={listRef} className="max-h-72 overflow-y-auto" style={{ borderTop: "0.75px solid var(--rule)" }}>
        {guesses.length === 0 && <div className="log-empty">The log is empty. Name your first border.</div>}
        {guesses.map((g, i) => {
          const s = COLOR_STYLES[g.color] ?? COLOR_STYLES.grey;
          return (
            <div key={`${g.code}-${i}`} className="log-row fade-in">
              <span className="log-num">{i + 1}.</span>
              <span className="log-dot" style={{ color: s.ink }}>{s.dot}</span>
              <span className={`log-name ${g.color === "grey" ? "off" : ""}`}>
                {g.code.startsWith("~") && <span style={{ color: "var(--sub)" }}>≈ </span>}
                {g.name}
              </span>
              <span className="log-tag" style={{ color: s.ink }}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="log-row log-end">
        <span className="log-num" />
        <span className="log-dot" style={{ color: "var(--warn)" }}>✕</span>
        <span className="log-name" style={{ color: "var(--warn)" }}>{endName}</span>
        <span className="log-tag">destination</span>
      </div>
    </div>
  );
}
