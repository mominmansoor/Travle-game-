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
import { connectedComponent, evaluateGuess, findConnectedPath, nextStop } from "@/lib/bfs";
import { guessOptions, isWater, nodeName } from "@/data/nodes";
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
const HELP_SEEN_KEY = "travle_help_seen";

function maxGuesses(state: LevelState) {
  return state.pathLength + 5 - (state.hintsUsed ?? 0);
}

const nameOf = nodeName;

/** "United States → ≈ Bering Strait → Russia" — water stops get a ≈ */
function routeText(codes: string[]) {
  return codes.map((c) => (isWater(c) ? `≈ ${nameOf(c)}` : nameOf(c))).join(" → ");
}

type Panel = "none" | "help" | "stats" | "themes" | "settings";

export default function Home() {
  const today = getTodayString();
  const { settings, updateSettings } = useSettings();

  const [sessionSeed, setSessionSeed] = useState(0);
  const [activeLevel, setActiveLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [levelStates, setLevelStates] = useState<(LevelState | null)[]>(Array(5).fill(null));
  const [puzzleIdxs, setPuzzleIdxs] = useState<number[]>([0, 0, 0, 0, 0]);
  const [panel, setPanel] = useState<Panel>("none");
  const [shareMsg, setShareMsg] = useState("");
  const [guessError, setGuessError] = useState("");

  const ocean = settings.oceanCrossings;

  useEffect(() => {
    setSessionSeed(getSessionSeed());
    try {
      if (!localStorage.getItem(HELP_SEEN_KEY)) {
        setPanel("help");
        localStorage.setItem(HELP_SEEN_KEY, "1");
      }
    } catch {}
  }, []);

  // (Re)build all five levels whenever the session starts or the
  // ocean-crossings setting flips — the graph changes, so the old
  // routes and their optimal paths would no longer be valid.
  useEffect(() => {
    if (!sessionSeed) return;
    const states = [1, 2, 3, 4, 5].map((level) => {
      const puzzle = generatePuzzle(levelSeed(sessionSeed, level, 0), level, ocean);
      if (!puzzle) return null;
      return initLevelState("session", level, puzzle.start, puzzle.end, puzzle.optimalPath, puzzle.pathLength, ocean);
    });

    setLevelStates(states);
    setPuzzleIdxs([0, 0, 0, 0, 0]);
    setGuessError("");
  }, [sessionSeed, ocean]);

  const currentState = levelStates[activeLevel - 1];
  const startName = currentState ? nameOf(currentState.startCode) : "";
  const endName = currentState ? nameOf(currentState.endCode) : "";
  const levelOcean = currentState?.oceanCrossings ?? false;

  /** Countries that can't be entered: the start, plus anything already guessed. */
  const usedCodes = new Set<string>(
    currentState ? [currentState.startCode, ...currentState.guesses.map((g) => g.code)] : []
  );

  function updateCurrent(next: LevelState) {
    const copy = [...levelStates];
    copy[activeLevel - 1] = next;
    setLevelStates(copy);
  }

  function handleGuess(code: string, name: string): boolean {
    if (!currentState || currentState.status !== "playing") return false;

    // No entering the same country twice (or "guessing" where you started)
    if (usedCodes.has(code)) {
      setGuessError(
        code === currentState.startCode
          ? `${name.toUpperCase()} IS YOUR START`
          : `ALREADY VISITED ${name.toUpperCase()}`
      );
      audio.greyGuess();
      return false;
    }
    setGuessError("");

    // Colour is judged from everything already linked to the start
    const chain = connectedComponent(
      currentState.guesses.map((g) => g.code),
      currentState.startCode,
      currentState.endCode,
      levelOcean
    );
    const color = evaluateGuess(code, chain, currentState.endCode, levelOcean);

    if (color === "green")       audio.greenGuess();
    else if (color === "orange") audio.orangeGuess();
    else                         audio.greyGuess();

    const guess: Guess = { code, name, color };
    const newGuesses = [...currentState.guesses, guess];

    const newGreenChain =
      color === "green" ? [...currentState.greenChain, code] : currentState.greenChain;

    // Win: any connected path from start to end exists through guessed countries
    const connectedPath = findConnectedPath(
      newGuesses.map((g) => g.code),
      currentState.startCode,
      currentState.endCode,
      levelOcean
    );
    const won = connectedPath !== null;
    const finalGreenChain = won ? connectedPath! : newGreenChain;

    const lost = !won && newGuesses.length >= maxGuesses(currentState);
    const newStatus = won ? "won" : lost ? "lost" : "playing";

    updateCurrent({
      ...currentState,
      guesses: newGuesses,
      greenChain: finalGreenChain,
      status: newStatus,
    });

    if (newStatus === "won") {
      audio.win();
      setUnlockedLevel((u) => Math.max(u, activeLevel + 1));
      recordLevelResult(true);
    } else if (newStatus === "lost") {
      audio.lose();
      setUnlockedLevel((u) => Math.max(u, activeLevel + 1));
      recordLevelResult(false);
    }
    return true;
  }

  // ── Hints ──────────────────────────────────────────────────────────────
  const hintTarget = currentState?.status === "playing"
    ? nextStop(currentState.guesses.map((g) => g.code), currentState.startCode, currentState.endCode, levelOcean)
    : null;
  const activeHint =
    currentState?.hintCode && currentState.hintCode === hintTarget ? currentState.hintLevel ?? 0 : 0;
  const guessesLeft = currentState ? maxGuesses(currentState) - currentState.guesses.length : 0;
  const canHint = !!hintTarget && activeHint < 2 && guessesLeft > 1;

  function handleHint() {
    if (!currentState || !hintTarget || !canHint) return;
    audio.menuNav();
    updateCurrent({
      ...currentState,
      hintsUsed: (currentState.hintsUsed ?? 0) + 1,
      hintCode: hintTarget,
      hintLevel: activeHint + 1,
    });
  }

  function handleShare() {
    if (!currentState || (currentState.status !== "won" && currentState.status !== "lost")) return;
    const str = buildShareString(
      activeLevel,
      currentState.guesses,
      currentState.status,
      currentState.pathLength,
      currentState.hintsUsed ?? 0
    );
    navigator.clipboard.writeText(str).catch(() => {});
    setShareMsg("COPIED!");
    setTimeout(() => setShareMsg(""), 2000);
  }

  function loadPuzzle(idx: number) {
    const puzzle = generatePuzzle(levelSeed(sessionSeed, activeLevel, idx), activeLevel, ocean);
    if (!puzzle) return;
    const fresh = initLevelState("session", activeLevel, puzzle.start, puzzle.end, puzzle.optimalPath, puzzle.pathLength, ocean);
    const newPuzzleIdxs = [...puzzleIdxs];
    newPuzzleIdxs[activeLevel - 1] = idx;
    setPuzzleIdxs(newPuzzleIdxs);
    updateCurrent(fresh);
    setGuessError("");
  }

  const handleReset = () => loadPuzzle(puzzleIdxs[activeLevel - 1]);
  const handleNext = () => loadPuzzle(puzzleIdxs[activeLevel - 1] + 1);

  function switchLevel(level: number) {
    setActiveLevel(level);
    setGuessError("");
    audio.menuNav();
    setPanel("none");
  }

  function togglePanel(p: Panel) {
    setPanel((cur) => (cur === p ? "none" : p));
    audio.menuNav();
  }

  const totalGuesses = currentState?.guesses.length ?? 0;
  const guessMax = currentState ? maxGuesses(currentState) : 0;
  // A route of N hops needs N − 1 countries in between
  const minGuesses = currentState ? Math.max(1, currentState.pathLength - 1) : 1;
  const efficiency = currentState && totalGuesses > 0
    ? Math.min(100, Math.round((minGuesses / totalGuesses) * 100))
    : 0;
  const stats = loadStats();
  const hintsUsed = currentState?.hintsUsed ?? 0;

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="flex items-baseline gap-3">
          <span className="brand cursor-inline">TRAVLE.EXE</span>
          <span className="date">{today}</span>
        </div>
        <nav className="flex gap-3">
          {(
            [
              ["help", "[?]"],
              ["stats", "[STATS]"],
              ["themes", "[THEME]"],
              ["settings", "[CFG]"],
            ] as [Panel, string][]
          ).map(([p, label]) => (
            <button key={p} className={`nav-btn ${panel === p ? "on" : ""}`} onClick={() => togglePanel(p)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── How to play ── */}
      {panel === "help" && (
        <Terminal title="HOW TO PLAY" className="mb-4">
          <div className="help">
            <p>
              Get from <b style={{ color: "var(--text)" }}>the start</b> to <b style={{ color: "var(--warn)" }}>the target</b>{" "}
              by naming the countries in between. Each one needs to share a border with something you&apos;ve already linked up.
            </p>
            <ul>
              <li><span style={{ color: "var(--accent)" }}>■ green</span> touches your chain and gets you one step closer</li>
              <li><span style={{ color: "var(--warn)" }}>■ orange</span> a detour, up to 2 steps off the best route</li>
              <li><span style={{ color: "var(--sub)" }}>■ grey</span> way off, or doesn&apos;t connect at all</li>
            </ul>
            <p>
              You get the shortest route + 5 guesses, and each country can only be entered once. Stuck? <b>[HINT]</b> shows
              the next stop, but burns a guess. Turn on <b>ocean crossings</b> in [CFG] and seas and oceans become
              stops too: to cross water you have to name it, e.g. United States → Bering Strait → Russia.
            </p>
            <div style={{ textAlign: "right" }}>
              <button className="tbtn primary" onClick={() => setPanel("none")}>[ GOT IT ]</button>
            </div>
          </div>
        </Terminal>
      )}

      {/* ── Settings panel ── */}
      {panel === "settings" && (
        <Terminal title="SETTINGS" className="mb-4">
          <div className="flex flex-col gap-3" style={{ fontSize: "0.85rem" }}>
            {(
              [
                { key: "oceanCrossings", label: "OCEAN CROSSINGS", hint: "name seas & oceans to cross them · rebuilds puzzles" },
                { key: "sounds", label: "SOUNDS" },
                { key: "scanlines", label: "SCANLINES" },
                { key: "greenText", label: "GREEN TEXT MODE" },
              ] as { key: keyof typeof settings; label: string; hint?: string }[]
            ).map(({ key, label, hint }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span style={{ color: "var(--text)" }}>
                  {label}
                  {hint && <span className="setting-hint">{hint}</span>}
                </span>
                <button
                  role="switch"
                  aria-checked={settings[key]}
                  onClick={() => updateSettings({ [key]: !settings[key] })}
                  className={`tbtn ${settings[key] ? "primary" : ""}`}
                  style={{ minWidth: 56 }}
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
      {panel === "stats" && (
        <Terminal title="STATISTICS" className="mb-4">
          <div className="stat-grid">
            <div><b>{stats.totalPlayed}</b><span>PLAYED</span></div>
            <div><b style={{ color: "var(--green)" }}>{stats.totalWon}</b><span>WON</span></div>
            <div>
              <b>{stats.totalPlayed ? Math.round((stats.totalWon / stats.totalPlayed) * 100) : 0}%</b>
              <span>WIN RATE</span>
            </div>
            <div><b style={{ color: "var(--orange)" }}>{stats.currentStreak}</b><span>STREAK</span></div>
            <div><b style={{ color: "var(--orange)" }}>{stats.bestStreak}</b><span>BEST</span></div>
          </div>
          <StatsChart history={stats.dayHistory} />
        </Terminal>
      )}

      {/* ── Theme selector panel ── */}
      {panel === "themes" && (
        <Terminal title="THEME" className="mb-4">
          <ThemeSelector />
        </Terminal>
      )}

      {/* ── Level tabs ── */}
      <div className="level-tabs">
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
              className={`level-tab ${active ? "active" : ""}`}
              style={{
                color: locked ? "var(--grey)" : won ? "var(--green)" : lost ? "var(--red)" : active ? "var(--green)" : "var(--text)",
              }}
              title={locked ? "Finish the previous level to unlock" : LEVEL_LABELS[level - 1]}
            >
              <span>L{level}</span>
              <span className="tab-name">{locked ? "LOCKED" : LEVEL_LABELS[level - 1]}</span>
              <span className="tab-mark">{won ? "✓" : lost ? "✗" : locked ? "·" : ""}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main game area ── */}
      {currentState ? (
        <>
          {/* Route header */}
          <Terminal
            title={`LEVEL ${activeLevel} — ${LEVEL_LABELS[activeLevel - 1]}`}
            right={levelOcean ? <span style={{ color: "var(--accent)" }}>~ OCEAN ON</span> : undefined}
            className="mb-3"
          >
            <div className="route-line">
              <span className="route-start">{startName}</span>
              <span className="route-arrow">──▶</span>
              <span className="route-end">{endName}</span>
            </div>

            <div className="route-meta">
              <span>
                SHORTEST <b style={{ color: "var(--green)" }}>{currentState.pathLength}</b> hops
              </span>
              <span className="flex items-center gap-2" style={{ flex: 1 }}>
                <span className="meter" aria-label={`${totalGuesses} of ${guessMax} guesses used`}>
                  {Array.from({ length: currentState.pathLength + 5 }).map((_, i) => {
                    const g = currentState.guesses[i];
                    const burnt = i >= guessMax;
                    return (
                      <span
                        key={i}
                        style={{
                          background: g
                            ? g.color === "green" ? "var(--accent)" : g.color === "orange" ? "var(--warn)" : "var(--sub)"
                            : burnt ? "transparent" : undefined,
                          borderStyle: burnt ? "dashed" : undefined,
                        }}
                      />
                    );
                  })}
                </span>
                <span style={{ color: guessesLeft <= 2 && currentState.status === "playing" ? "var(--orange)" : "var(--text)", whiteSpace: "nowrap" }}>
                  {totalGuesses}/{guessMax}
                </span>
              </span>
              <span className="flex gap-2" style={{ marginLeft: "auto" }}>
                {currentState.status === "playing" && (
                  <button className="tbtn" onClick={handleHint} disabled={!canHint} title="Reveal the next stop — costs one guess">
                    [HINT]
                  </button>
                )}
                <button className="tbtn" onClick={handleReset} title="Restart this puzzle">
                  [RESET]
                </button>
              </span>
            </div>

            {activeHint > 0 && hintTarget && (
              <div className="hint-line">
                💡{" "}
                {activeHint === 1 ? (
                  <>
                    next stop starts with <b>&lsquo;{nameOf(hintTarget)[0]}&rsquo;</b> ({nameOf(hintTarget).replace(/[^A-Za-zÀ-ÿ]/g, "").length} letters)
                    {canHint && <span style={{ color: "var(--sub)" }}> · hint again for the full name</span>}
                  </>
                ) : (
                  <>next stop: <b>{nameOf(hintTarget)}</b></>
                )}
              </div>
            )}
          </Terminal>

          {/* World map */}
          <Terminal title="MAP" className="mb-3" compact>
            <MapDisplay
              key={`${activeLevel}-${puzzleIdxs[activeLevel - 1]}-${levelOcean}`}
              guesses={currentState.guesses}
              startCode={currentState.startCode}
              endCode={currentState.endCode}
              status={currentState.status}
              optimalPath={currentState.optimalPath}
              greenChain={currentState.greenChain}
              ocean={levelOcean}
            />
          </Terminal>

          {/* Input */}
          {currentState.status === "playing" ? (
            <div className="w-full mb-3">
              <GuessInput onSubmit={handleGuess} excluded={usedCodes} options={guessOptions(levelOcean)}
                placeholder={levelOcean ? "TYPE A COUNTRY, SEA OR OCEAN..." : undefined}
              />
              <div className="input-foot">
                {guessError ? (
                  <span style={{ color: "var(--red)" }}>✗ {guessError}</span>
                ) : (
                  <span>
                    {guessesLeft} guess{guessesLeft === 1 ? "" : "es"} left · press <b>/</b> to type · ↑↓ to pick
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* ── Result panel ── */
            <Terminal
              title={currentState.status === "won" ? "PATH COMPLETE" : "GAME OVER"}
              borderColor={currentState.status === "won" ? "var(--accent)" : "var(--error)"}
              className="mb-3"
            >
              <div style={{ fontSize: "0.85rem" }}>
                {currentState.status === "won" ? (
                  <div className="result-grid">
                    <div><b style={{ color: "var(--green)" }}>{minGuesses}</b><span>BEST POSSIBLE</span></div>
                    <div><b>{totalGuesses}</b><span>YOUR GUESSES</span></div>
                    <div>
                      <b style={{ color: efficiency >= 80 ? "var(--green)" : efficiency >= 50 ? "var(--orange)" : "var(--red)" }}>
                        {efficiency}%
                      </b>
                      <span>EFFICIENCY</span>
                    </div>
                    {hintsUsed > 0 && <div><b>💡{hintsUsed}</b><span>HINTS</span></div>}
                  </div>
                ) : (
                  <div style={{ color: "var(--red)", letterSpacing: "0.1em", marginBottom: "8px" }}>✗ OUT OF GUESSES</div>
                )}

                <div className="route-summary">
                  <span>{currentState.status === "won" ? "YOUR ROUTE" : "BEST ROUTE"}</span>
                  {routeText(currentState.status === "won" ? currentState.greenChain : currentState.optimalPath)}
                </div>

                <div className="emoji-trail">
                  {currentState.guesses.map((g) => (g.color === "green" ? "🟩" : g.color === "orange" ? "🟧" : "⬜")).join("")}
                </div>

                <div className="flex gap-2 justify-center flex-wrap">
                  <button className="tbtn primary" onClick={handleShare}>{shareMsg || "[ SHARE ]"}</button>
                  {activeLevel < 5 && (
                    <button className="tbtn" onClick={() => switchLevel(activeLevel + 1)}>[ NEXT LEVEL → ]</button>
                  )}
                  <button className="tbtn warn" onClick={handleNext}>[ NEW PUZZLE ↻ ]</button>
                </div>
              </div>
            </Terminal>
          )}

          {/* Guess history */}
          <Terminal title="PATH LOG" right={<span style={{ color: "var(--sub)" }}>{totalGuesses} entered</span>} className="mb-3">
            <GuessHistory
              guesses={currentState.guesses}
              startName={startName}
              endName={endName}
              greenChain={currentState.greenChain}
            />
          </Terminal>
        </>
      ) : (
        <Terminal className="w-full">
          <div style={{ textAlign: "center", color: "var(--dim)", padding: "24px" }}>
            LOADING PUZZLE<span className="cursor-inline" />
          </div>
        </Terminal>
      )}
    </div>
  );
}
