"use client";

import React from "react";

interface TerminalProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  width?: string;
  compact?: boolean;
}

/**
 * Reusable terminal-style bordered container using ASCII box-drawing chars.
 */
export default function Terminal({
  title,
  children,
  className = "",
  width = "w-full",
  compact = false,
}: TerminalProps) {
  const pad = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div
      className={`${width} ${className}`}
      style={{ color: "var(--fg)" }}
    >
      {/* Top border */}
      <div className="flex items-center" style={{ color: "var(--border)" }}>
        <span style={{ color: "var(--dim)" }}>┌</span>
        {title ? (
          <>
            <span style={{ color: "var(--dim)" }}>─</span>
            <span className="px-1" style={{ color: "var(--fg)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
              {title}
            </span>
            <span
              style={{
                color: "var(--dim)",
                flex: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {"─".repeat(80)}
            </span>
          </>
        ) : (
          <span
            style={{
              color: "var(--dim)",
              flex: 1,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {"─".repeat(80)}
          </span>
        )}
        <span style={{ color: "var(--dim)" }}>┐</span>
      </div>

      {/* Content */}
      <div
        className={`border-l border-r ${pad}`}
        style={{ borderColor: "var(--border)" }}
      >
        {children}
      </div>

      {/* Bottom border */}
      <div className="flex items-center" style={{ color: "var(--dim)" }}>
        <span>└</span>
        <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
          {"─".repeat(80)}
        </span>
        <span>┘</span>
      </div>
    </div>
  );
}
