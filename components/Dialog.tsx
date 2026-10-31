"use client";

import React, { useEffect, useRef } from "react";
import { IconClose } from "@/components/Icons";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Ink-filled variant, used for the end-of-leg result */
  inverse?: boolean;
}

/** A popup window over a dithered backdrop. Esc or the close box dismisses it. */
export default function Dialog({ title, onClose, children, inverse }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`dialog ${inverse ? "inverse" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ outline: "none" }}
      >
        <div className="dialog-bar">
          <h2>{title}</h2>
          <span className="grip" aria-hidden />
          <button className="close-box" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
