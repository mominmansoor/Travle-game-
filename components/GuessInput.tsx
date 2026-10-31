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
    <div className={`composer ${shaking ? "shake" : ""}`}>
      {suggestions.length > 0 && (
        <div className="suggestions" role="listbox">
          {suggestions.map((c, i) => (
            <div
              key={c.code}
              onMouseDown={(e) => e.preventDefault() /* keep focus in the input */}
              onClick={() => selectSuggestion(c)}
              role="option"
              aria-selected={i === selectedIdx}
              className={`suggestion ${i === selectedIdx ? "on" : ""}`}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span>{c.name}</span>
              {c.water && <span className="water">≈ water</span>}
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder ?? "Your next country"}
        aria-label="Country name"
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <span className="keys" aria-hidden>↑↓ pick · ⏎ go</span>
      <button className="btn" onClick={submitCurrent} disabled={disabled || !value.trim()}>
        Go
      </button>
    </div>
  );
}
