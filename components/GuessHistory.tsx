"use client";

import React, { useEffect, useRef } from "react";
import { Guess, GuessColor } from "@/lib/gameState";
import { IconBook } from "@/components/Icons";

interface GuessHistoryProps {
  guesses: Guess[];
  startName: string;
  endName: string;
  greenChain: string[];
}

const STYLE: Record<GuessColor, { sw: string; label: string; row: string }> = {
  green:  { sw: "sw-on",     label: "on course", row: "" },
  orange: { sw: "sw-detour", label: "detour",    row: "" },
  grey:   { sw: "sw-adrift", label: "adrift",    row: "adrift" },
};

/** The logbook: a file-tree of where you've been, newest at the bottom. */
export default function GuessHistory({ guesses, startName, endName }: GuessHistoryProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [guesses]);

  return (
    <div ref={ref} className="log-scroll">
      <div className="tree-head log-head">
        <IconBook />
        Logbook
      </div>
      <ul className="tree">
        <li>
          <div className="log-row">
            <span className="n" />
            <span className="sw sw-start" />
            <span className="name">{startName}</span>
          </div>
        </li>
        {guesses.length === 0 && (
          <li>
            <div className="log-empty">nothing logged yet</div>
          </li>
        )}
        {guesses.map((g, i) => {
          const s = STYLE[g.color] ?? STYLE.grey;
          return (
            <li key={`${g.code}-${i}`} className="fade-in" title={s.label}>
              <div className={`log-row ${s.row}`}>
                <span className="n">{i + 1}</span>
                <span className={`sw ${s.sw}`} aria-label={s.label} />
                <span className="name">
                  {g.code.startsWith("~") && "≈ "}
                  {g.name}
                </span>
              </div>
            </li>
          );
        })}
        <li>
          <div className="log-row">
            <span className="n" />
            <span className="sw sw-end" />
            <span className="name" style={{ fontWeight: 700 }}>{endName}</span>
          </div>
        </li>
      </ul>
    </div>
  );
}
