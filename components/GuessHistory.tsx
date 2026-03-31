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
  green:  { accent: "var(--accent)",  label: "ON PATH",   char: "█" },
  orange: { accent: "var(--orange)",  label: "DETOUR",    char: "▓" },
  grey:   { accent: "var(--sub)",     label: "OFF TRACK", char: "░" },
};

export default function GuessHistory({ guesses, startName, endName, greenChain }: GuessHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [guesses]);

  const greenChainSet = new Set(greenChain.slice(1));

  return (
    <div className="w-full">
      {/* Start */}
      <div
        className="flex items-center gap-2 py-1 px-2 mb-1"
        style={{ color: "var(--text)" }}
      >
        <span style={{ color: "var(--sub)" }}>◉</span>
        <span>{startName}</span>
        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--sub)" }}>START</span>
      </div>

      {/* Guesses */}
      <div className="max-h-64 overflow-y-auto">
        {guesses.map((g, i) => {
          const style = COLOR_STYLES[g.color] ?? COLOR_STYLES["grey"];
          const onChain = g.color === "green" && greenChainSet.has(g.code);
          return (
            <div
              key={i}
              className="flex items-center gap-2 py-1 px-2 fade-in"
              style={{
                color: "var(--text)",
                borderLeft: `2px solid ${onChain ? style.accent : "transparent"}`,
                marginBottom: "2px",
                opacity: g.color === "grey" ? 0.6 : 1,
              }}
            >
              {/* Colored icon */}
              <span style={{ width: "16px", textAlign: "center", fontSize: "0.8rem", color: style.accent }}>
                {style.char}
              </span>
              {/* Country name — always full text color */}
              <span className="flex-1">{g.name}</span>
              {/* Label — colored to match result */}
              <span style={{ fontSize: "0.7rem", color: style.accent }}>
                {style.label}
              </span>
              {g.color === "green" && (
                <span style={{ fontSize: "0.7rem", color: "var(--sub)" }}>
                  [{greenChain.indexOf(g.code)}]
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* End */}
      <div
        className="flex items-center gap-2 py-1 px-2 mt-1"
        style={{
          color: "var(--text)",
          borderTop: "1px dashed var(--sub)",
          marginTop: "4px",
          paddingTop: "6px",
        }}
      >
        <span style={{ color: "var(--orange)" }}>◎</span>
        <span>{endName}</span>
        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--orange)" }}>TARGET</span>
      </div>
    </div>
  );
}
