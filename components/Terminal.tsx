"use client";

import React from "react";

interface PanelProps {
  title?: string;
  /** Small italic note pinned to the top-right of the frame */
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** No card-stock tint, just the rule */
  plain?: boolean;
  /** Tint the rule (e.g. green ink on a win) */
  borderColor?: string;
}

/**
 * A ruled box with its title set into the top edge, like a cartouche on a
 * printed chart. (File keeps its old name so imports don't churn.)
 */
export default function Terminal({ title, right, children, className = "", plain, borderColor }: PanelProps) {
  return (
    <section
      className={`panel ${plain ? "plain" : ""} ${className}`}
      style={borderColor ? { borderColor, borderWidth: 1.25 } : undefined}
    >
      {title && <div className="panel-title">{title}</div>}
      {right && <div className="panel-right">{right}</div>}
      <div className="px-4 pt-6 pb-4 sm:px-6">{children}</div>
    </section>
  );
}
