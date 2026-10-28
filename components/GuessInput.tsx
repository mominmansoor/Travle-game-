"use client";

import React, { useEffect, useRef, useState } from "react";
import { COUNTRY_OPTIONS, GuessOption } from "@/data/nodes";
import audio from "@/lib/audio";

interface GuessInputProps {
  /** Return false to reject the guess (input stays, box shakes). */
  onSubmit: (code: string, name: string) => boolean | void;
  disabled?: boolean;
  /** Country codes that can't be guessed again — hidden from suggestions. */
  excluded?: Set<string>;
  /** What can be typed in (countries, plus seas/oceans in ocean mode). */
  options?: GuessOption[];
  placeholder?: string;
}

export default function GuessInput({ onSubmit, disabled, placeholder, excluded, options = COUNTRY_OPTIONS }: GuessInputProps) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<GuessOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus({ preventScroll: true });
  }, [disabled]);

  // "/" jumps to the input from anywhere on the page
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && t?.tagName !== "INPUT" && t?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    audio.keyClick();
    if (v.length < 1) {
      setSuggestions([]);
      return;
    }
    const lower = v.toLowerCase();
    // Prefix matches first, then matches anywhere (name or alias)
    const terms = (c: GuessOption) => [c.name, ...(c.aliases ?? [])].map((t) => t.toLowerCase());
    const open = options.filter((c) => !excluded?.has(c.code));
    const prefix = open.filter((c) => terms(c).some((t) => t.startsWith(lower)));
    const inner = open.filter((c) => !prefix.includes(c) && terms(c).some((t) => t.includes(lower)));
    const matches = [...prefix, ...inner].slice(0, 8);
    setSuggestions(matches);
    setSelectedIdx(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submitCurrent();
    } else if (e.key === "Tab" && suggestions.length > 0) {
      // Tab completes the highlighted suggestion into the box
      e.preventDefault();
      setValue(suggestions[selectedIdx].name);
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setValue("");
    }
  }

  function submitCurrent() {
    let country =
      suggestions.length > 0 ? suggestions[selectedIdx] : null;

    if (!country) {
      // Try exact match by name
      const lower = value.toLowerCase();
      country =
        options.find((c) => [c.name, ...(c.aliases ?? [])].some((t) => t.toLowerCase() === lower)) ?? null;
    }

    if (!country) {
      triggerShake();
      return;
    }

    if (onSubmit(country.code, country.name) === false) {
      triggerShake();
      return;
    }
    setValue("");
    setSuggestions([]);
    setSelectedIdx(0);
    inputRef.current?.focus();
  }

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  }

  function selectSuggestion(c: GuessOption) {
    if (onSubmit(c.code, c.name) === false) {
      triggerShake();
      return;
    }
    setValue("");
    setSuggestions([]);
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full">
      <div
        className={`guess-box flex items-center ${shaking ? "shake" : ""}`}
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg-alt)",
        }}
      >
        <span style={{ color: "var(--green)", padding: "0 8px" }}>{">"}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "TYPE COUNTRY NAME..."}
          className="flex-1 bg-transparent py-2 pr-3"
          style={{
            color: "var(--fg)",
            caretColor: "var(--green)",
            outline: "none",
            fontSize: "16px", // ≥16px stops iOS zooming in on focus
          }}
          aria-label="Country name"
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          onClick={submitCurrent}
          disabled={disabled}
          className="px-3 py-2"
          style={{
            color: disabled ? "var(--grey)" : "var(--green)",
            borderLeft: "1px solid var(--border)",
            background: "transparent",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          [ENTER]
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50"
          role="listbox"
          style={{
            border: "1px solid var(--border)",
            borderTop: "none",
            background: "var(--bg-alt)",
          }}
        >
          {suggestions.map((c, i) => (
            <div
              key={c.code}
              onClick={() => selectSuggestion(c)}
              role="option"
              aria-selected={i === selectedIdx}
              className="px-4 py-1 cursor-pointer"
              style={{
                background: i === selectedIdx ? "rgba(0,255,65,0.08)" : "transparent",
                color: i === selectedIdx ? "var(--green)" : "var(--fg)",
                borderLeft: i === selectedIdx ? "2px solid var(--green)" : "2px solid transparent",
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              {i === selectedIdx ? "> " : "  "}
              {c.water && <span style={{ color: "var(--accent)" }}>≈ </span>}
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
