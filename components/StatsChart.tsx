"use client";

import React from "react";
import { DayStats } from "@/lib/gameState";

interface StatsChartProps {
  history: DayStats[];
}

export default function StatsChart({ history }: StatsChartProps) {
  const recent = history.slice(-30);
  const maxLevels = 5;
  const barHeight = 8; // lines tall

  if (recent.length === 0) {
    return (
      <div style={{ color: "var(--dim)", textAlign: "center", padding: "16px" }}>
        NO DATA YET — PLAY SOME PUZZLES
      </div>
    );
  }

  // Build ASCII bar chart
  const rows: string[] = [];
  for (let row = barHeight; row >= 1; row--) {
    let line = "";
    for (let i = 0; i < recent.length; i++) {
      const d = recent[i];
      const barVal = d.levelsCompleted; // 0-5
      const filled = (barVal / maxLevels) * barHeight >= row;
      if (filled) {
        line += d.won ? "█" : "▒";
      } else {
        line += " ";
      }
      if (i < recent.length - 1) line += " ";
    }
    const label = row === barHeight ? `${maxLevels}` : row % 2 === 0 ? `${row}` : " ";
    rows.push(`${label.padStart(1)} │${line}│`);
  }

  // X-axis
  const xAxis = `  └${"─".repeat(recent.length * 2 - 1)}┘`;

  // Date labels (just first and last)
  const firstDate = recent[0]?.date?.slice(5) ?? "";
  const lastDate = recent[recent.length - 1]?.date?.slice(5) ?? "";
  const spacing = Math.max(0, (recent.length * 2 - 1) - firstDate.length - lastDate.length - 2);
  const dateRow = `   ${firstDate}${" ".repeat(spacing)}${lastDate}`;

  return (
    <div style={{ fontFamily: "monospace", fontSize: "0.8rem", lineHeight: "1.4" }}>
      <div style={{ color: "var(--dim)", marginBottom: "4px", fontSize: "0.7rem" }}>
        LEVELS COMPLETED PER DAY (LAST {recent.length} DAYS) — █ WIN  ▒ LOSS
      </div>
      <pre style={{ color: "var(--fg)", margin: 0, overflow: "auto" }}>
        {rows.join("\n")}
        {"\n" + xAxis}
        {"\n" + dateRow}
      </pre>
    </div>
  );
}
