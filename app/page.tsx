"use client";

import React, { useState, useEffect } from "react";
import Dialog from "@/components/Dialog";
import GuessInput from "@/components/GuessInput";
import GuessHistory from "@/components/GuessHistory";
import StatsChart from "@/components/StatsChart";
import MapDisplay from "@/components/MapDisplay";
import ThemeSelector from "@/components/ThemeSelector";
import { useSettings } from "@/components/SettingsProvider";
import { generatePuzzle, getSessionSeed, levelSeed } from "@/data/puzzles";
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
import {
  IconBulb, IconCaret, IconCheck, IconClose, IconDisplay, IconFace, IconFlag, IconFolder,
  IconGlobe, IconHelp, IconLedger, IconLock, IconRestart, IconSettings,
} from "@/components/Icons";

const LEVEL_LABELS = ["coastal", "inland", "frontier", "uncharted", "here-be-dragons"];
const LEVEL_DIFFICULTY = ["easy", "medium", "hard", "expert", "nightmare"];
const NUMERALS = ["I", "II", "III", "IV", "V"];
const HELP_SEEN_KEY = "travle_help_seen";


const nameOf = nodeName;

type Panel = "none" | "help" | "stats" | "themes" | "settings" | "result";

export default function Home() {
  const { settings, updateSettings } = useSettings();

  const [sessionSeed, setSessionSeed] = useState(0);
  const [activeLevel, setActiveLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [levelStates, setLevelStates] = useState<(LevelState | null)[]>(Array(5).fill(null));
  const [puzzleIdxs, setPuzzleIdxs] = useState<number[]>([0, 0, 0, 0, 0]);
  const [panel, setPanel] = useState<Panel>("none");
  const [shareMsg, setShareMsg] = useState("");
  const [guessError, setGuessError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const ocean = settings.oceanCrossings;

  // Menu-bar clock (client only, so server and client markup agree)
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

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
      setPanel("result");
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
    setPanel("result");
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

  const dateStr = now ? now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";
  const timeStr = now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
  const status = currentState?.status;
  const done = status === "won" || status === "lost";
  const closePanel = () => setPanel("none");

  return (
    <div>
      {/* ── Menu bar ── */}
      <header className="menubar">
        <span className="brand"><IconGlobe /> Travle</span>
        <span className="spacer" />
        <span className="date">{dateStr}</span>
        <span className="clock">{timeStr}</span>
      </header>

      <main className="desk">
        <div className="window">
          <div className="titlebar">
            <span className="lights" aria-hidden><i /><i /><i /></span>
            <h1>Travle</h1>
          </div>

          <div className="layout">
            {/* ── Toolbar ── */}
            <nav className="area-tools" aria-label="Menu">
              {(
                [
                  ["help", "How to play", IconHelp],
                  ["stats", "Ledger", IconLedger],
                  ["themes", "Display", IconDisplay],
                  ["settings", "Settings", IconSettings],
                ] as [Panel, string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement][]
              ).map(([p, label, Icon]) => (
                <button
                  key={p}
                  className={`icon-btn ${panel === p ? "on" : ""}`}
                  onClick={() => togglePanel(p)}
                  title={label}
                  aria-label={label}
                >
                  <Icon />
                </button>
              ))}
            </nav>

            {/* ── Route header ── */}
            <div className="area-route">
              {currentState ? (
                <>
                  <div className="route-title">
                    <span className="hash">#</span>
                    <span>{startName}</span>
                    <span className="arrow">→</span>
                    <span className="end">{endName}</span>
                  </div>
                  <div className="route-meta">
                    <span className="count">Shortest: [<b>{currentState.pathLength}</b>]</span>
                    <span>
                      {!done && (
                        <button className="icon-btn" onClick={handleHint} disabled={!canHint} title="Hint: reveal the next stop" aria-label="Hint">
                          <IconBulb />
                        </button>
                      )}
                      <button className="icon-btn" onClick={handleReset} title="Start this route over" aria-label="Start over">
                        <IconRestart />
                      </button>
                      {!done && (
                        <button className="icon-btn" onClick={handleGiveUp} title="Turn back: end this leg and show the route" aria-label="Turn back">
                          <IconFlag />
                        </button>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="route-title"><span className="hash">#</span><span className="cursor-blink">loading</span></div>
              )}
            </div>

            {/* ── Legs ── */}
            <div className="area-legs">
              <label className="select">
                <span className="sr-only">Route type</span>
                <select
                  value={ocean ? "sea" : "land"}
                  onChange={(e) => updateSettings({ oceanCrossings: e.target.value === "sea" })}
                  aria-label="Route type"
                >
                  <option value="land">Overland</option>
                  <option value="sea">Land &amp; sea</option>
                </select>
                <span className="caret"><IconCaret /></span>
              </label>

              <div className="tree-head">
                <span className="box" aria-hidden />
                <IconFolder />
                Legs
              </div>
              <ul className="tree" role="tablist" aria-label="Legs">
                {[1, 2, 3, 4, 5].map((level) => {
                  const state = levelStates[level - 1];
                  const locked = level > unlockedLevel;
                  const won = state?.status === "won";
                  const lost = state?.status === "lost";
                  const active = level === activeLevel;
                  const n = state?.guesses.length ?? 0;
                  return (
                    <li key={level}>
                      <button
                        role="tab"
                        aria-selected={active}
                        disabled={locked}
                        onClick={() => !locked && switchLevel(level)}
                        className={`leg ${active ? "active" : ""}`}
                        title={locked ? "Finish the previous leg to unlock" : `Leg ${level}: ${LEVEL_DIFFICULTY[level - 1]}`}
                      >
                        <span className="hash">#</span>
                        <span className="num">{NUMERALS[level - 1]}</span>
                        <span className="name">{LEVEL_LABELS[level - 1]}</span>
                        <span className="diff">{LEVEL_DIFFICULTY[level - 1]}</span>
                        {locked ? (
                          <span className="lock"><IconLock /></span>
                        ) : won ? (
                          <span className="badge ok" aria-label="arrived"><IconCheck /></span>
                        ) : lost ? (
                          <span className="badge no" aria-label="turned back"><IconClose /></span>
                        ) : n > 0 ? (
                          <span className="badge" aria-label={`${n} guesses`}>{n}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Map + guess bar ── */}
            <section className="area-main">
              {currentState ? (
                <>
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

                  {guessError ? (
                    <div className="notice err" role="status"><span className="tag">nope</span>{guessError}</div>
                  ) : activeHint > 0 && hintTarget ? (
                    <div className="notice" role="status">
                      <span className="tag">hint</span>
                      {activeHint === 1 ? (
                        <span>
                          Next stop starts with <b>{nameOf(hintTarget)[0]}</b> and has{" "}
                          {nameOf(hintTarget).replace(/[^A-Za-zÀ-ÿ]/g, "").length} letters.
                          {canHint && " Tap the bulb again for the name."}
                        </span>
                      ) : (
                        <span>Next stop is <b>{nameOf(hintTarget)}</b>.</span>
                      )}
                    </div>
                  ) : null}

                  {!done ? (
                    <GuessInput
                      onSubmit={handleGuess}
                      excluded={usedCodes}
                      options={guessOptions(levelOcean)}
                      placeholder={levelOcean ? "Your next country, sea or ocean" : undefined}
                    />
                  ) : (
                    <div className="composer done">
                      <span className="msg">
                        {status === "won" ? `Arrived in ${totalGuesses} guess${totalGuesses === 1 ? "" : "es"}.` : "You turned back."}
                      </span>
                      <button className="btn small" onClick={() => setPanel("result")}>Result</button>
                      <button className="btn small" onClick={handleNext}>New route</button>
                      {activeLevel < 5 && (
                        <button className="btn small solid" onClick={() => switchLevel(activeLevel + 1)}>Next leg →</button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="loading cursor-blink">Booting map</div>
              )}
            </section>

            {/* ── Logbook ── */}
            <aside className="area-log">
              {currentState && (
                <GuessHistory
                  guesses={currentState.guesses}
                  startName={startName}
                  endName={endName}
                  greenChain={currentState.greenChain}
                />
              )}
            </aside>

            {/* ── Status bar ── */}
            <footer className="area-status">
              <span className="inv"><IconFace /> leg {NUMERALS[activeLevel - 1]}</span>
              <span>{totalGuesses} guess{totalGuesses === 1 ? "" : "es"}</span>
              <span className="wide">best {minGuesses}</span>
              <span className="wide">hints {hintsUsed}</span>
              <span className="fill" />
              <span>{status === "won" ? "arrived" : status === "lost" ? "turned back" : levelOcean ? "land + sea" : "overland"}</span>
            </footer>
          </div>
        </div>
      </main>

      {/* ── Dialogs ── */}
      {panel === "help" && (
        <Dialog title="How to play" onClose={closePanel}>
          <div className="help">
            <p>
              Get from the <b>start</b> to the <b>destination</b>{" "}by naming the countries in between. Each one has to
              share a border with something you&apos;ve already linked up.
            </p>
            <ul>
              <li><i className="sw-on" /> <span><b>on course</b>: touches your chain and gets you a step closer</span></li>
              <li><i className="sw-detour" /> <span><b>detour</b>: up to two steps off the best route</span></li>
              <li><i className="sw-adrift" /> <span><b>adrift</b>: way off, or not connected at all</span></li>
            </ul>
            <p>
              There&apos;s no guess limit, but fewer is better, and each country can only be entered once. The bulb gives a
              hint, the flag turns back and shows you the route. Switch to <b>Land &amp; sea</b> and seas become stops
              too: United States → Bering Strait → Russia.
            </p>
            <p>
              Press <kbd>/</kbd> to start typing from anywhere, <kbd>↑</kbd><kbd>↓</kbd> to pick, <kbd>⏎</kbd> to go.
            </p>
            <div className="actions"><button className="btn solid" onClick={closePanel}>Let&apos;s go</button></div>
          </div>
        </Dialog>
      )}

      {panel === "stats" && (
        <Dialog title="Ledger" onClose={closePanel}>
          <div className="tiles">
            <div className="tile"><b>{stats.totalPlayed}</b><span>played</span></div>
            <div className="tile"><b>{stats.totalWon}</b><span>arrived</span></div>
            <div className="tile">
              <b>{stats.totalPlayed ? Math.round((stats.totalWon / stats.totalPlayed) * 100) : 0}%</b>
              <span>success</span>
            </div>
            <div className="tile"><b>{stats.currentStreak}</b><span>streak</span></div>
            <div className="tile"><b>{stats.bestStreak}</b><span>best streak</span></div>
          </div>
          <StatsChart history={stats.dayHistory} />
        </Dialog>
      )}

      {panel === "themes" && (
        <Dialog title="Display" onClose={closePanel}>
          <ThemeSelector />
        </Dialog>
      )}

      {panel === "settings" && (
        <Dialog title="Settings" onClose={closePanel}>
          {(
            [
              { key: "sounds", label: "Sounds", hint: "Little beeps for each guess." },
              { key: "oceanCrossings", label: "Land & sea", hint: "Seas and oceans become stops you can name. Redraws all five legs." },
            ] as { key: keyof typeof settings; label: string; hint: string }[]
          ).map(({ key, label, hint }) => (
            <label key={key} className="check-row">
              <input type="checkbox" checked={settings[key]} onChange={() => updateSettings({ [key]: !settings[key] })} />
              <span className="check"><IconCheck /></span>
              <span>
                <span className="label">{label}</span>
                <span className="sub">{hint}</span>
              </span>
            </label>
          ))}
        </Dialog>
      )}

      {panel === "result" && currentState && done && (
        <Dialog title={status === "won" ? "Arrived" : "Turned back"} onClose={closePanel} inverse>
          <p className="big-line">{status === "won" ? "You made it." : "Back to port."}</p>
          <p className="lede">
            {startName} to {endName}
            {status === "won"
              ? ` in ${totalGuesses} guess${totalGuesses === 1 ? "" : "es"}. The best possible was ${minGuesses}.`
              : ` after ${totalGuesses} guess${totalGuesses === 1 ? "" : "es"}. Here's the way through.`}
          </p>
          {status === "won" && (
            <div className="tiles">
              <div className="tile"><b>{totalGuesses}</b><span>guesses</span></div>
              <div className="tile"><b>{minGuesses}</b><span>best possible</span></div>
              <div className="tile"><b>{efficiency}%</b><span>efficiency</span></div>
              {hintsUsed > 0 && <div className="tile"><b>{hintsUsed}</b><span>hints</span></div>}
            </div>
          )}
          <div className="route-chain">
            <span className="k">{status === "won" ? "your route" : "the route"}</span>
            {(status === "won" ? currentState.greenChain : currentState.optimalPath).map((c, i) => (
              <React.Fragment key={c}>
                {i > 0 && <span className="sep">→</span>}
                <span style={{ whiteSpace: "nowrap" }}>{isWater(c) ? `≈ ${nameOf(c)}` : nameOf(c)}</span>
              </React.Fragment>
            ))}
          </div>
          {totalGuesses > 0 && (
            <div className="trail" aria-hidden>
              {currentState.guesses.map((g, i) => (
                <i key={i} className={g.color === "green" ? "sw-on" : g.color === "orange" ? "sw-detour" : "sw-adrift"} />
              ))}
            </div>
          )}
          <div className="actions">
            <button className="btn solid" onClick={handleShare}>{shareMsg || "Share"}</button>
            {activeLevel < 5 && <button className="btn" onClick={() => switchLevel(activeLevel + 1)}>Next leg →</button>}
            <button className="btn" onClick={() => { handleNext(); closePanel(); }}>New route</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
