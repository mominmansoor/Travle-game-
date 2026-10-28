"use client";

import React from "react";

interface TerminalProps {
  title?: string;
  /** Small status text pinned to the top-right of the frame */
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  width?: string;
  compact?: boolean;
  /** Tint the frame (e.g. accent on a win) */
  borderColor?: string;
}

/**
 * Terminal-style panel: a single bordered box with its title sitting in
 * the top edge, so the frame always lines up at any width.
 */
export default function Terminal({
  title,
  right,
  children,
  className = "",
  width = "w-full",
  compact = false,
  borderColor,
}: TerminalProps) {
  const pad = compact ? "px-2 pt-4 pb-2" : "px-4 pt-5 pb-3";

  return (
    <section
      className={`panel ${width} ${className}`}
      style={{ color: "var(--fg)", borderColor: borderColor ?? undefined }}
    >
      {title && <div className="panel-title">{title}</div>}
      {right && <div className="panel-right">{right}</div>}
      <div className={pad}>{children}</div>
    </section>
  );
}
