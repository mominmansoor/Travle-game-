"use client";

import React from "react";
import { DayStats } from "@/lib/gameState";

interface StatsChartProps {
  history: DayStats[];
}

/** Legs finished per day as chunky pixel bars: solid for a winning day, dithered otherwise. */
export default function StatsChart({ history }: StatsChartProps) {
  const recent = history.slice(-30);

  if (recent.length === 0) {
    return <p className="pixel" style={{ margin: "4px 0", opacity: 0.7 }}>No days logged yet. Finish a leg to start the chart.</p>;
  }

  const W = 480;
  const H = 130;
  const pad = { l: 18, r: 2, t: 6, b: 20 };
  const ih = H - pad.t - pad.b;
  const slot = (W - pad.l - pad.r) / Math.max(recent.length, 10);
  const bw = Math.max(6, Math.floor(slot * 0.62));

  return (
    <div>
      <div className="pixel" style={{ fontSize: "0.95rem", marginBottom: 6 }}>legs finished · last {recent.length} day{recent.length === 1 ? "" : "s"}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Legs finished per day" shapeRendering="crispEdges">
        <defs>
          <pattern id="ledger-dither" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="var(--paper)" />
            <rect width="2" height="2" fill="var(--ink)" />
            <rect x="2" y="2" width="2" height="2" fill="var(--ink)" />
          </pattern>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((v) => {
          const y = Math.round(pad.t + ih - (v / 5) * ih);
          return (
            <g key={v}>
              {v > 0 && (
                <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--ink)" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="2 4" />
              )}
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="11" fill="var(--ink)" fontFamily="var(--pixel)">
                {v}
              </text>
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih + 1} y2={pad.t + ih + 1} stroke="var(--ink)" strokeWidth={2.5} />
        {recent.map((d, i) => {
          const h = Math.round((d.levelsCompleted / 5) * ih);
          const x = Math.round(pad.l + slot * i + (slot - bw) / 2);
          return (
            <rect
              key={d.date}
              x={x}
              y={pad.t + ih - h}
              width={bw}
              height={h}
              fill={d.won ? "var(--ink)" : "url(#ledger-dither)"}
              stroke="var(--ink)"
              strokeWidth={2}
            >
              <title>{`${d.date}: ${d.levelsCompleted} leg${d.levelsCompleted === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
        <text x={pad.l} y={H - 3} fontSize="11" fill="var(--ink)" fontFamily="var(--pixel)">
          {recent[0].date.slice(5)}
        </text>
        {recent.length > 1 && (
          <text x={W - pad.r} y={H - 3} textAnchor="end" fontSize="11" fill="var(--ink)" fontFamily="var(--pixel)">
            {recent[recent.length - 1].date.slice(5)}
          </text>
        )}
      </svg>
    </div>
  );
}
