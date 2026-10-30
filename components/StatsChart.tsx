"use client";

import React from "react";
import { DayStats } from "@/lib/gameState";

interface StatsChartProps {
  history: DayStats[];
}

/** Legs completed per day, drawn as inked bars on ruled paper. */
export default function StatsChart({ history }: StatsChartProps) {
  const recent = history.slice(-30);

  if (recent.length === 0) {
    return (
      <p style={{ textAlign: "center", fontStyle: "italic", color: "var(--sub)", margin: "6px 0" }}>
        No voyages recorded yet. Finish a leg to start the ledger.
      </p>
    );
  }

  const W = 600;
  const H = 150;
  const pad = { l: 22, r: 6, t: 8, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / Math.max(recent.length, 7);
  const bw = Math.min(16, slot * 0.6);

  return (
    <div>
      <div style={{ fontFamily: "var(--caps)", letterSpacing: "0.1em", fontSize: "0.78rem", color: "var(--sub)", textAlign: "center", marginBottom: 4 }}>
        legs completed, last {recent.length} day{recent.length === 1 ? "" : "s"}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Legs completed per day">
        {[0, 1, 2, 3, 4, 5].map((v) => {
          const y = pad.t + ih - (v / 5) * ih;
          return (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--text)" strokeOpacity={v === 0 ? 0.6 : 0.12} strokeWidth={0.75} strokeDasharray={v === 0 ? undefined : "2 3"} />
              <text x={pad.l - 6} y={y} textAnchor="end" dominantBaseline="central" fontSize="11" fill="var(--sub)" fontFamily="var(--serif)">
                {v}
              </text>
            </g>
          );
        })}
        {recent.map((d, i) => {
          const h = (d.levelsCompleted / 5) * ih;
          const x = pad.l + slot * i + (slot - bw) / 2;
          return (
            <rect
              key={d.date}
              x={x}
              y={pad.t + ih - h}
              width={bw}
              height={h}
              fill={d.won ? "var(--accent)" : "var(--sub)"}
              fillOpacity={d.won ? 0.85 : 0.45}
              stroke="var(--text)"
              strokeWidth={0.6}
            >
              <title>{`${d.date}: ${d.levelsCompleted} leg${d.levelsCompleted === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
        <text x={pad.l} y={H - 4} fontSize="11" fill="var(--sub)" fontFamily="var(--serif)" fontStyle="italic">
          {recent[0].date.slice(5)}
        </text>
        {recent.length > 1 && (
          <text x={W - pad.r} y={H - 4} textAnchor="end" fontSize="11" fill="var(--sub)" fontFamily="var(--serif)" fontStyle="italic">
            {recent[recent.length - 1].date.slice(5)}
          </text>
        )}
      </svg>
    </div>
  );
}
