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
  getUnlockedLevel,
  saveUnlockedLevel,
  buildShareString,
  Guess,
  LevelState,
} from "@/lib/gameState";
import audio from "@/lib/audio";

const LEVEL_LABELS = ["Coastal", "Inland", "Frontier", "Uncharted", "Here be dragons"];
const LEVEL_DIFFICULTY = ["easy", "medium", "hard", "expert", "nightmare"];
const NUMERALS = ["I", "II", "III", "IV", "V"];
const HELP_SEEN_KEY = "travle_help_seen";


const nameOf = nodeName;

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
    setUnlockedLevel(getUnlockedLevel());
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

  /** Unlock up to `level` now and remember it for next time. */
  function unlockUpTo(level: number) {
    setUnlockedLevel((u) => Math.max(u, Math.min(5, level)));
    saveUnlockedLevel(level);
  }

  function handleGuess(code: string, name: string): boolean {
    if (!currentState || currentState.status !== "playing") return false;

    // No entering the same country twice (or "guessing" where you started)
    if (usedCodes.has(code)) {
      setGuessError(
        code === currentState.startCode
          ? `${name} is where you set out from`
          : `You've already been through ${name}`
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

    // No guess limit: a leg only ends when you arrive or choose to turn back
    const newStatus = won ? "won" : "playing";

    updateCurrent({
      ...currentState,
      guesses: newGuesses,
      greenChain: finalGreenChain,
      status: newStatus,
    });

    if (newStatus === "won") {
      audio.win();
      unlockUpTo(activeLevel + 1);
      recordLevelResult(true);
    }
    return true;
  }

  // ── Hints ──────────────────────────────────────────────────────────────
  const hintTarget = currentState?.status === "playing"
    ? nextStop(currentState.guesses.map((g) => g.code), currentState.startCode, currentState.endCode, levelOcean)
    : null;
  const activeHint =
    currentState?.hintCode && currentState.hintCode === hintTarget ? currentState.hintLevel ?? 0 : 0;
  const canHint = !!hintTarget && activeHint < 2;

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

  /** Turn back: end the leg and reveal the route you were looking for. */
  function handleGiveUp() {
    if (!currentState || currentState.status !== "playing") return;
    audio.lose();
    updateCurrent({ ...currentState, status: "lost" });
    unlockUpTo(activeLevel + 1);
    recordLevelResult(false);
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
    setShareMsg("Copied");
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
  // A route of N hops needs N − 1 countries in between
  const minGuesses = currentState ? Math.max(1, currentState.pathLength - 1) : 1;
  const efficiency = currentState && totalGuesses > 0
    ? Math.min(100, Math.round((minGuesses / totalGuesses) * 100))
    : 0;
  const stats = loadStats();
  const hintsUsed = currentState?.hintsUsed ?? 0;

  const prettyDate = (() => {
    const d = new Date(`${today}T12:00:00`);
    return isNaN(d.getTime())
      ? today
      : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  })();

  return (
    <div className="app-shell">
      <div className="sheet">
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
        <div className="sheet-inner">
          {/* ── Masthead ── */}
          <header className="masthead">
            <div className="kicker">{prettyDate}</div>
            <h1 className="brand">Trav<em>le</em></h1>
            <div className="tagline">Name every border between here and there.</div>
            <div className="flourish"><span>✦</span></div>
            <nav className="app-nav">
              {(
                [
                  ["help", "How to play"],
                  ["stats", "Ledger"],
                  ["themes", "Charts"],
                  ["settings", "Settings"],
                ] as [Panel, string][]
              ).map(([p, label]) => (
                <button key={p} className={`nav-btn ${panel === p ? "on" : ""}`} onClick={() => togglePanel(p)} aria-expanded={panel === p}>
                  {label}
                </button>
              ))}
            </nav>
          </header>

          {/* ── How to play ── */}
          {panel === "help" && (
            <Terminal title="How to play" className="mb-5">
              <div className="help">
                <p>
                  Get from <b>where you set out</b> to <b style={{ color: "var(--warn)" }}>your destination</b> by naming the
                  countries in between. Each one has to share a border with something you&apos;ve already linked up.
                </p>
                <ul>
                  <li><span style={{ color: "var(--accent)" }}>●</span> <i>on course</i>, it touches your chain and brings you a step closer</li>
                  <li><span style={{ color: "var(--warn)" }}>◐</span> <i>detour</i>, up to two steps off the best route</li>
                  <li><span style={{ color: "var(--sub)" }}>○</span> <i>adrift</i>, way off, or doesn&apos;t connect at all</li>
                </ul>
                <p>
                  There&apos;s no limit on guesses, but fewer is better, and each country can only be entered once. Stuck? A
                  hint shows the next stop, or you can turn back to see the route. Turn on <b>ocean crossings</b> in settings and seas become stops
                  too: to cross water you have to name it, e.g. United States → Bering Strait → Russia.
                </p>
                <div style={{ textAlign: "center" }}>
                  <button className="btn primary" onClick={() => setPanel("none")}>Set sail</button>
                </div>
              </div>
            </Terminal>
          )}

          {/* ── Settings ── */}
          {panel === "settings" && (
            <Terminal title="Settings" className="mb-5">
              {(
                [
                  { key: "oceanCrossings", label: "Ocean crossings", hint: "Name seas and oceans to cross them. Redraws all five legs." },
                  { key: "sounds", label: "Sounds" },
                ] as { key: keyof typeof settings; label: string; hint?: string }[]
              ).map(({ key, label, hint }) => (
                <div key={key} className="setting-row">
                  <span>
                    <span className="label">{label}</span>
                    {hint && <span className="setting-hint">{hint}</span>}
                  </span>
                  <button
                    role="switch"
                    aria-checked={settings[key]}
                    onClick={() => updateSettings({ [key]: !settings[key] })}
                    className={`btn ${settings[key] ? "on" : "quiet"}`}
                    style={{ minWidth: 64 }}
                  >
                    {settings[key] ? "On" : "Off"}
                  </button>
                </div>
              ))}
              <div className="setting-row" style={{ display: "block" }}>
                <span className="label" style={{ display: "block", marginBottom: 8 }}>Chart style</span>
                <ThemeSelector />
              </div>
            </Terminal>
          )}

          {/* ── Ledger ── */}
          {panel === "stats" && (
            <Terminal title="The ledger" className="mb-5">
              <div className="stat-grid">
                <div><b>{stats.totalPlayed}</b><span>voyages</span></div>
                <div><b style={{ color: "var(--accent)" }}>{stats.totalWon}</b><span>arrived</span></div>
                <div>
                  <b>{stats.totalPlayed ? Math.round((stats.totalWon / stats.totalPlayed) * 100) : 0}%</b>
                  <span>success</span>
                </div>
                <div><b style={{ color: "var(--warn)" }}>{stats.currentStreak}</b><span>streak</span></div>
                <div><b style={{ color: "var(--warn)" }}>{stats.bestStreak}</b><span>best</span></div>
              </div>
              <StatsChart history={stats.dayHistory} />
            </Terminal>
          )}

          {/* ── Chart styles ── */}
          {panel === "themes" && (
            <Terminal title="Chart style" className="mb-5">
              <ThemeSelector />
            </Terminal>
          )}

          {/* ── Legs ── */}
          <div className="level-tabs" role="tablist">
            {[1, 2, 3, 4, 5].map((level) => {
              const state = levelStates[level - 1];
              const locked = level > unlockedLevel;
              const won = state?.status === "won";
              const lost = state?.status === "lost";
              const active = level === activeLevel;

              return (
                <button
                  key={level}
                  role="tab"
                  aria-selected={active}
                  disabled={locked}
                  onClick={() => !locked && switchLevel(level)}
                  className={`level-tab ${active ? "active" : ""} ${won ? "won" : ""} ${lost ? "lost" : ""}`}
                  title={locked ? "Finish the previous leg to unlock" : `Leg ${level}: ${LEVEL_DIFFICULTY[level - 1]}`}
                >
                  <span className="tab-num">{NUMERALS[level - 1]}</span>
                  <span className="tab-name">{LEVEL_LABELS[level - 1]}</span>
                  <span className="tab-mark">{won ? "✓" : lost ? "✕" : locked ? "🔒︎" : ""}</span>
                </button>
              );
            })}
          </div>

          {/* ── Main game area ── */}
          {currentState ? (
            <>
              {/* Route header */}
              <section className="route-head">
                <div className="kicker caps" style={{ color: "var(--sub)", fontSize: "0.8rem", letterSpacing: "0.2em" }}>
                  Leg {NUMERALS[activeLevel - 1]} · {LEVEL_DIFFICULTY[activeLevel - 1]}
                  {levelOcean && <> · by land &amp; sea</>}
                </div>
                <div className="route-line">
                  <span className="route-start">{startName}</span>
                  <span className="route-arrow">⟶</span>
                  <span className="route-end">{endName}</span>
                </div>

                <div className="route-meta">
                  <span>
                    shortest route <b>{currentState.pathLength}</b> borders
                  </span>
                  <span className="flex items-center gap-2">
                    {totalGuesses > 0 && (
                      <span className="meter" aria-hidden>
                        {currentState.guesses.map((g, i) => {
                          const ink = g.color === "green" ? "var(--accent)" : g.color === "orange" ? "var(--warn)" : "var(--sub)";
                          return <span key={i} style={{ background: ink, borderColor: ink }} />;
                        })}
                      </span>
                    )}
                    <span style={{ whiteSpace: "nowrap" }}>
                      <b>{totalGuesses}</b> guess{totalGuesses === 1 ? "" : "es"}
                    </span>
                  </span>
                </div>

                <div className="route-actions">
                  {currentState.status === "playing" && (
                    <button className="btn quiet" onClick={handleHint} disabled={!canHint} title="Reveal the next stop">
                      Hint
                    </button>
                  )}
                  <button className="btn quiet" onClick={handleReset} title="Restart this route">
                    Start over
                  </button>
                  {currentState.status === "playing" && (
                    <button className="btn quiet" onClick={handleGiveUp} title="End this leg and reveal the route">
                      Turn back
                    </button>
                  )}
                </div>

                {activeHint > 0 && hintTarget && (
                  <div className="hint-line">
                    {activeHint === 1 ? (
                      <>
                        The next stop begins with <b>{nameOf(hintTarget)[0]}</b> and has{" "}
                        {nameOf(hintTarget).replace(/[^A-Za-zÀ-ÿ]/g, "").length} letters.
                        {canHint && <span style={{ color: "var(--sub)" }}> Ask again for the full name.</span>}
                      </>
                    ) : (
                      <>The next stop is <b>{nameOf(hintTarget)}</b>.</>
                    )}
                  </div>
                )}
              </section>

              {/* Input */}
              {currentState.status === "playing" && (
                <div className="mb-1">
                  <GuessInput
                    onSubmit={handleGuess}
                    excluded={usedCodes}
                    options={guessOptions(levelOcean)}
                    placeholder={levelOcean ? "Country, sea or ocean…" : undefined}
                  />
                  <div className="input-foot">
                    {guessError ? (
                      <span className="err">{guessError}</span>
                    ) : (
                      <span>
                        press <kbd>/</kbd> to write · <kbd>↑</kbd><kbd>↓</kbd> to choose
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* The chart */}
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

              {/* Result */}
              {currentState.status !== "playing" && (
                <Terminal
                  title={currentState.status === "won" ? "Arrived" : "Turned back"}
                  borderColor={currentState.status === "won" ? "var(--accent)" : "var(--error)"}
                  className="mt-6"
                >
                  {currentState.status === "won" ? (
                    <div className="result-grid">
                      <div><b style={{ color: "var(--accent)" }}>{minGuesses}</b><span>best possible</span></div>
                      <div><b>{totalGuesses}</b><span>your guesses</span></div>
                      <div>
                        <b style={{ color: efficiency >= 80 ? "var(--accent)" : efficiency >= 50 ? "var(--warn)" : "var(--error)" }}>
                          {efficiency}%
                        </b>
                        <span>efficiency</span>
                      </div>
                      {hintsUsed > 0 && <div><b>{hintsUsed}</b><span>hints</span></div>}
                    </div>
                  ) : (
                    <div className="result-verdict" style={{ color: "var(--error)" }}>You turned back after {totalGuesses} guess{totalGuesses === 1 ? "" : "es"}.</div>
                  )}

                  <div className="route-summary">
                    <div className="label">{currentState.status === "won" ? "your route" : "the route you were looking for"}</div>
                    {(currentState.status === "won" ? currentState.greenChain : currentState.optimalPath).map((c, i) => (
                      <React.Fragment key={c}>
                        {i > 0 && <span className="sep">→</span>}
                        <span style={{ whiteSpace: "nowrap", fontStyle: isWater(c) ? "italic" : undefined }}>{nameOf(c)}</span>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="emoji-trail">
                    {currentState.guesses.map((g) => (g.color === "green" ? "🟩" : g.color === "orange" ? "🟧" : "⬜")).join("")}
                  </div>

                  <div className="result-actions">
                    <button className="btn primary" onClick={handleShare}>{shareMsg || "Share"}</button>
                    {activeLevel < 5 && (
                      <button className="btn" onClick={() => switchLevel(activeLevel + 1)}>Next leg →</button>
                    )}
                    <button className="btn quiet" onClick={handleNext}>New route</button>
                  </div>
                </Terminal>
              )}

              {/* Logbook */}
              <Terminal title="Logbook" right={`${totalGuesses} entr${totalGuesses === 1 ? "y" : "ies"}`} plain className="mt-6">
                <GuessHistory
                  guesses={currentState.guesses}
                  startName={startName}
                  endName={endName}
                  greenChain={currentState.greenChain}
                />
              </Terminal>
            </>
          ) : (
            <p style={{ textAlign: "center", fontStyle: "italic", color: "var(--sub)", padding: "40px 0" }}>
              Unrolling the chart…
            </p>
          )}
        </div>
      </div>
      <div className="foot-note">A new set of routes every visit · progress stays in your browser</div>
    </div>
  );
}
