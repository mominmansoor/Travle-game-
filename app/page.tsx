"use client";

import React, { useState, useEffect } from "react";
import Terminal from "@/components/Terminal";
import GuessInput from "@/components/GuessInput";
import GuessHistory from "@/components/GuessHistory";
import StatsChart from "@/components/StatsChart";
import MapDisplay from "@/components/MapDisplay";
import ThemeSelector from "@/components/ThemeSelector";
import { useSettings } from "@/components/SettingsProvider";
import { generatePuzzle, getSessionSeed, getTodayString, levelSeed } from "@/data/puzzles";
import { COUNTRY_MAP } from "@/data/countries";
import { evaluateGuess, findConnectedPath } from "@/lib/bfs";
import {
  initLevelState,
  recordLevelResult,
  loadStats,
  buildShareString,
  Guess,
  LevelState,
} from "@/lib/gameState";
import audio from "@/lib/audio";

const LEVEL_LABELS = ["EASY", "MEDIUM", "HARD", "EXPERT", "NIGHTMARE"];

function maxGuesses(pathLength: number) {
  return pathLength + 5;
}

export default function Home() {
  const today = getTodayString();
  const { settings, updateSettings } = useSettings();

  const [sessionSeed, setSessionSeed] = useState(0);
  const [activeLevel, setActiveLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [levelStates, setLevelStates] = useState<(LevelState | null)[]>(Array(5).fill(null));
  const [puzzleIdxs, setPuzzleIdxs] = useState<number[]>([0, 0, 0, 0, 0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    const seed = getSessionSeed();
    setSessionSeed(seed);

    const states = [1, 2, 3, 4, 5].map((level) => {
      const puzzle = generatePuzzle(levelSeed(seed, level, 0), level);
      if (!puzzle) return null;
      return initLevelState("session", level, puzzle.start, puzzle.end, puzzle.optimalPath, puzzle.pathLength);
    });

    setLevelStates(states);
    setUnlockedLevel(1);
  }, []);

  const currentState = levelStates[activeLevel - 1];
  const startName = currentState ? (COUNTRY_MAP.get(currentState.startCode)?.name ?? currentState.startCode) : "";
  const endName = currentState ? (COUNTRY_MAP.get(currentState.endCode)?.name ?? currentState.endCode) : "";

  function handleGuess(code: string, name: string) {
    if (!currentState || currentState.status !== "playing") return;

    // Last country in the green chain is the "current position" for coloring
    const lastGreen = currentState.greenChain[currentState.greenChain.length - 1];
    const color = evaluateGuess(code, lastGreen, currentState.endCode);

    if (color === "green")       audio.greenGuess();
    else if (color === "orange") audio.orangeGuess();
    else                         audio.greyGuess();

    const guess: Guess = { code, name, color };
    const newGuesses = [...currentState.guesses, guess];

    // Green chain only grows on GREEN guesses (used for map highlight + history display)
    const newGreenChain =
      color === "green"
        ? [...currentState.greenChain, code]
        : currentState.greenChain;

    // Win: any connected path from start to end exists through guessed countries
    const connectedPath = findConnectedPath(
      newGuesses.map((g) => g.code),
      currentState.startCode,
      currentState.endCode
    );
    const won = connectedPath !== null;
    // Use the connected path as greenChain for win animation if found
    const finalGreenChain = won ? connectedPath! : newGreenChain;

    // Lose: all guesses used up without completing the chain
    const lost = !won && newGuesses.length >= maxGuesses(currentState.pathLength);
    const newStatus = won ? "won" : lost ? "lost" : "playing";

    const newState: LevelState = {
      ...currentState,
      guesses: newGuesses,
      greenChain: finalGreenChain,
      status: newStatus,
    };

    const newLevelStates = [...levelStates];
    newLevelStates[activeLevel - 1] = newState;
    setLevelStates(newLevelStates);

    if (newStatus === "won") {
      audio.win();
      setUnlockedLevel((u) => Math.max(u, activeLevel + 1));
      recordLevelResult(true);
    } else if (newStatus === "lost") {
      audio.lose();
      setUnlockedLevel((u) => Math.max(u, activeLevel + 1));
      recordLevelResult(false);
    }
  }

  function handleShare() {
    if (!currentState || (currentState.status !== "won" && currentState.status !== "lost")) return;
    const str = buildShareString(
      activeLevel,
      currentState.guesses,
      currentState.status,
      currentState.pathLength
    );
    navigator.clipboard.writeText(str).catch(() => {});
    setShareMsg("COPIED!");
    setTimeout(() => setShareMsg(""), 2000);
  }

  function handleReset() {
    const curIdx = puzzleIdxs[activeLevel - 1];
    const puzzle = generatePuzzle(levelSeed(sessionSeed, activeLevel, curIdx), activeLevel);
    if (!puzzle) return;
    const fresh = initLevelState("session", activeLevel, puzzle.start, puzzle.end, puzzle.optimalPath, puzzle.pathLength);
    const newLevelStates = [...levelStates];
    newLevelStates[activeLevel - 1] = fresh;
    setLevelStates(newLevelStates);
  }

  function handleNext() {
    const nextIdx = puzzleIdxs[activeLevel - 1] + 1;
    const puzzle = generatePuzzle(levelSeed(sessionSeed, activeLevel, nextIdx), activeLevel);
    if (!puzzle) return;
    const fresh = initLevelState("session", activeLevel, puzzle.start, puzzle.end, puzzle.optimalPath, puzzle.pathLength);
    const newPuzzleIdxs = [...puzzleIdxs];
    newPuzzleIdxs[activeLevel - 1] = nextIdx;
    setPuzzleIdxs(newPuzzleIdxs);
    const newLevelStates = [...levelStates];
    newLevelStates[activeLevel - 1] = fresh;
    setLevelStates(newLevelStates);
  }

  function switchLevel(level: number) {
    setActiveLevel(level);
    audio.menuNav();
    setShowSettings(false);
    setShowStats(false);
  }

  const totalGuesses = currentState?.guesses.length ?? 0;
  const guessMax     = currentState ? maxGuesses(currentState.pathLength) : 0;
  const efficiency   = currentState && totalGuesses > 0
    ? Math.round((currentState.pathLength / totalGuesses) * 100)
    : 0;
  const stats = loadStats();

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ padding: "16px", maxWidth: "720px", margin: "0 auto" }}
    >
      {/* ── Header ── */}
      <div
        className="w-full flex items-center justify-between mb-4"
        style={{ borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}
      >
        <div>
          <span style={{ color: "var(--green)", fontSize: "1.1rem", letterSpacing: "0.15em" }}>
            TRAVLE.EXE
          </span>
          <span style={{ color: "var(--dim)", marginLeft: "12px", fontSize: "0.75rem" }}>
            {today}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowStats(!showStats);
              setShowSettings(false);
              setShowThemes(false);
              audio.menuNav();
            }}
            style={{
              color: showStats ? "var(--green)" : "var(--dim)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            [STATS]
          </button>
          <button
            onClick={() => {
              setShowThemes(!showThemes);
              setShowSettings(false);
              setShowStats(false);
              audio.menuNav();
            }}
            style={{
              color: showThemes ? "var(--green)" : "var(--dim)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            [THEME]
          </button>
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowStats(false);
              setShowThemes(false);
              audio.menuNav();
            }}
            style={{
              color: showSettings ? "var(--green)" : "var(--dim)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            [CFG]
          </button>
        </div>
      </div>

      {/* ── Settings panel ── */}
      {showSettings && (
        <Terminal title="SETTINGS" className="w-full mb-4">
          <div className="flex flex-col gap-3" style={{ fontSize: "0.85rem" }}>
            {(
              [
                { key: "scanlines", label: "SCANLINES" },
                { key: "sounds", label: "SOUNDS" },
                { key: "greenText", label: "GREEN TEXT MODE" },
              ] as { key: keyof typeof settings; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span style={{ color: "var(--dim)" }}>{label}</span>
                <button
                  onClick={() => updateSettings({ [key]: !settings[key] })}
                  style={{
                    color: settings[key] ? "var(--green)" : "var(--grey)",
                    background: "none",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                  }}
                >
                  {settings[key] ? "[ON ]" : "[OFF]"}
                </button>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "4px" }}>
              <div style={{ color: "var(--dim)", fontSize: "0.75rem", marginBottom: "8px" }}>THEME</div>
              <ThemeSelector />
            </div>
          </div>
        </Terminal>
      )}

      {/* ── Stats panel ── */}
      {showStats && (
        <Terminal title="STATISTICS" className="w-full mb-4">
          <div style={{ fontSize: "0.8rem", marginBottom: "12px" }}>
            <div className="flex gap-6" style={{ color: "var(--dim)", flexWrap: "wrap" }}>
              <span>
                PLAYED: <span style={{ color: "var(--fg)" }}>{stats.totalPlayed}</span>
              </span>
              <span>
                WON: <span style={{ color: "var(--green)" }}>{stats.totalWon}</span>
              </span>
              <span>
                STREAK: <span style={{ color: "var(--orange)" }}>{stats.currentStreak}</span>
              </span>
              <span>
                BEST: <span style={{ color: "var(--orange)" }}>{stats.bestStreak}</span>
              </span>
            </div>
          </div>
          <StatsChart history={stats.dayHistory} />
        </Terminal>
      )}

      {/* ── Theme selector panel ── */}
      {showThemes && (
        <Terminal title="THEME" className="w-full mb-4">
          <ThemeSelector />
        </Terminal>
      )}

      {/* ── Level tabs ── */}
      <div className="w-full flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((level) => {
          const state = levelStates[level - 1];
          const locked = level > unlockedLevel;
          const won = state?.status === "won";
          const lost = state?.status === "lost";
          const active = level === activeLevel;

          return (
            <button
              key={level}
              disabled={locked}
              onClick={() => !locked && switchLevel(level)}
              className="flex-1 py-1"
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.05em",
                background: active ? "rgba(0,255,65,0.08)" : "transparent",
                border: active ? "1px solid var(--green)" : "1px solid var(--border)",
                color: locked
                  ? "var(--grey)"
                  : won
                  ? "var(--green)"
                  : lost
                  ? "var(--red)"
                  : active
                  ? "var(--green)"
                  : "var(--dim)",
                cursor: locked ? "not-allowed" : "pointer",
              }}
            >
              {locked ? `L${level} --` : won ? `L${level} OK` : lost ? `L${level} XX` : `L${level}`}
            </button>
          );
        })}
      </div>

      {/* ── Main game area ── */}
      {currentState ? (
        <>
          {/* Puzzle header */}
          <Terminal
            title={`LEVEL ${activeLevel} — ${LEVEL_LABELS[activeLevel - 1]}`}
            className="w-full mb-3"
          >
            <div style={{ fontSize: "0.8rem" }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: "var(--dim)" }}>ROUTE:</span>
                <span style={{ color: "var(--fg)" }}>{startName}</span>
                <span style={{ color: "var(--dim)" }}>→</span>
                <span style={{ color: "var(--orange)" }}>{endName}</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span style={{ color: "var(--dim)" }}>
                  OPTIMAL:{" "}
                  <span style={{ color: "var(--green)" }}>{currentState.pathLength}</span> steps
                </span>
                <span style={{ color: "var(--dim)" }}>
                  GUESSES:{" "}
                  <span
                    style={{
                      color:
                        totalGuesses >= guessMax * 0.7
                          ? "var(--orange)"
                          : "var(--fg)",
                    }}
                  >
                    {totalGuesses}
                  </span>
                  /{guessMax}
                </span>
                {currentState.status !== "playing" && (
                  <span
                    style={{
                      color:
                        currentState.status === "won" ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {currentState.status === "won" ? "✓ SOLVED" : "✗ FAILED"}
                  </span>
                )}
                <button
                  onClick={handleReset}
                  style={{
                    marginLeft: "auto",
                    color: "var(--dim)",
                    background: "none",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    padding: "1px 7px",
                    fontSize: "0.7rem",
                    fontFamily: "inherit",
                  }}
                >
                  [RESET]
                </button>
              </div>
            </div>
          </Terminal>

          {/* World map */}
          <Terminal title="MAP" className="w-full mb-3" compact>
            <MapDisplay
              key={`${activeLevel}-${puzzleIdxs[activeLevel - 1]}`}
              guesses={currentState.guesses}
              startCode={currentState.startCode}
              endCode={currentState.endCode}
              status={currentState.status}
              optimalPath={currentState.optimalPath}
              greenChain={currentState.greenChain}
            />
          </Terminal>

          {/* Guess history */}
          <Terminal title="PATH LOG" className="w-full mb-3">
            <GuessHistory
              guesses={currentState.guesses}
              startName={startName}
              endName={endName}
              greenChain={currentState.greenChain}
            />
          </Terminal>

          {/* Input */}
          {currentState.status === "playing" ? (
            <div className="w-full mb-2">
              <GuessInput onSubmit={handleGuess} />
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--dim)",
                  marginTop: "6px",
                  textAlign: "center",
                }}
              >
                GREEN = on path &nbsp;|&nbsp; ORANGE = detour &nbsp;|&nbsp; GREY = off track
              </div>
            </div>
          ) : (
            /* ── Result panel ── */
            <Terminal
              title={currentState.status === "won" ? "PATH COMPLETE" : "GAME OVER"}
              className="w-full mb-3"
            >
              {currentState.status === "won" ? (
                /* WIN screen */
                <div style={{ fontSize: "0.85rem" }}>
                  <div style={{ marginBottom: "10px", lineHeight: "1.8" }}>
                    <div style={{ color: "var(--dim)" }}>
                      optimal:{"  "}
                      <span style={{ color: "var(--green)" }}>{currentState.pathLength}</span>
                      {" "}countries
                    </div>
                    <div style={{ color: "var(--dim)" }}>
                      your path:{" "}
                      <span style={{ color: "var(--fg)" }}>{totalGuesses}</span>
                      {" "}guesses
                    </div>
                    <div style={{ color: "var(--dim)" }}>
                      efficiency:{" "}
                      <span style={{ color: efficiency >= 80 ? "var(--green)" : efficiency >= 50 ? "var(--orange)" : "var(--red)" }}>
                        {efficiency}%
                      </span>
                    </div>
                  </div>

                  {/* Emoji trail */}
                  <div style={{ fontSize: "1.1rem", letterSpacing: "3px", marginBottom: "12px", textAlign: "center" }}>
                    {currentState.guesses.map((g) =>
                      g.color === "green" ? "🟩" : g.color === "orange" ? "🟧" : "⬜"
                    ).join("")}
                  </div>

                  <div className="flex gap-2 justify-center flex-wrap">
                    <button onClick={handleShare} style={{ color: "var(--green)", background: "none", border: "1px solid var(--green)", cursor: "pointer", padding: "4px 12px", fontSize: "0.8rem", fontFamily: "inherit" }}>
                      {shareMsg || "[ SHARE ]"}
                    </button>
                    {activeLevel < 5 && (
                      <button onClick={() => switchLevel(activeLevel + 1)} style={{ color: "var(--dim)", background: "none", border: "1px solid var(--border)", cursor: "pointer", padding: "4px 12px", fontSize: "0.8rem", fontFamily: "inherit" }}>
                        [ NEXT LEVEL →]
                      </button>
                    )}
                    <button onClick={handleNext} style={{ color: "var(--orange)", background: "none", border: "1px solid var(--orange)", cursor: "pointer", padding: "4px 12px", fontSize: "0.8rem", fontFamily: "inherit" }}>
                      [ NEW PUZZLE ↻]
                    </button>
                  </div>
                </div>
              ) : (
                /* LOSE screen */
                <div style={{ fontSize: "0.85rem" }}>
                  <div style={{ color: "var(--red)", letterSpacing: "0.1em", marginBottom: "8px" }}>
                    ✗ MAX GUESSES REACHED
                  </div>
                  <div style={{ color: "var(--dim)", marginBottom: "4px", fontSize: "0.75rem" }}>
                    OPTIMAL PATH:
                  </div>
                  <div style={{ color: "var(--dim)", fontSize: "0.75rem", marginBottom: "12px", wordBreak: "break-word" }}>
                    {currentState.optimalPath.map((c) => COUNTRY_MAP.get(c)?.name ?? c).join(" → ")}
                  </div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <button onClick={handleShare} style={{ color: "var(--green)", background: "none", border: "1px solid var(--green)", cursor: "pointer", padding: "4px 12px", fontSize: "0.8rem", fontFamily: "inherit" }}>
                      {shareMsg || "[ SHARE ]"}
                    </button>
                    {activeLevel < 5 && (
                      <button onClick={() => switchLevel(activeLevel + 1)} style={{ color: "var(--dim)", background: "none", border: "1px solid var(--border)", cursor: "pointer", padding: "4px 12px", fontSize: "0.8rem", fontFamily: "inherit" }}>
                        [ NEXT LEVEL →]
                      </button>
                    )}
                    <button onClick={handleNext} style={{ color: "var(--orange)", background: "none", border: "1px solid var(--orange)", cursor: "pointer", padding: "4px 12px", fontSize: "0.8rem", fontFamily: "inherit" }}>
                      [ NEW PUZZLE ↻]
                    </button>
                  </div>
                </div>
              )}
            </Terminal>
          )}
        </>
      ) : (
        <Terminal className="w-full">
          <div style={{ textAlign: "center", color: "var(--dim)", padding: "24px" }}>
            LOADING PUZZLE...
          </div>
        </Terminal>
      )}
    </div>
  );
}
