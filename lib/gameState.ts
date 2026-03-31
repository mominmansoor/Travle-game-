import { getTodayString } from "@/data/puzzles";

export type GuessColor = "green" | "orange" | "grey";

export interface Guess {
  code: string;
  name: string;
  color: GuessColor;
}

export interface LevelState {
  date: string;
  level: number;
  guesses: Guess[];
  status: "idle" | "playing" | "won" | "lost";
  hintsUsed: number;
  startCode: string;
  endCode: string;
  optimalPath: string[];
  pathLength: number;
  /** Ordered chain of GREEN-guessed countries starting with startCode */
  greenChain: string[];
}

export interface DayStats {
  date: string;
  levelsCompleted: number; // 0-5
  won: boolean;
}

export interface GlobalStats {
  totalPlayed: number;
  totalWon: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string;
  dayHistory: DayStats[]; // last 30 days
}

const LEVEL_KEY = (date: string, level: number, idx = 0) => `travle_level_${date}_${level}_${idx}`;
const STATS_KEY = "travle_stats";
const SETTINGS_KEY = "travle_settings";
const UNLOCKED_KEY = (date: string) => `travle_unlocked_${date}`;

export interface Settings {
  scanlines: boolean;
  sounds: boolean;
  greenText: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  scanlines: true,
  sounds: true,
  greenText: false,
};

// ── Level State ──────────────────────────────────────────────────────────────

export function loadLevelState(date: string, level: number, idx = 0): LevelState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEVEL_KEY(date, level, idx));
    if (!raw) return null;
    const state = JSON.parse(raw) as LevelState;
    // Migrate: add greenChain if missing
    if (!state.greenChain) state.greenChain = [state.startCode];
    // Migrate: remap old "red" guesses to "grey" (border-rejection no longer exists)
    state.guesses = state.guesses.map((g) =>
      (g.color as string) === "red" ? { ...g, color: "grey" as const } : g
    );
    return state;
  } catch {
    return null;
  }
}

export function saveLevelState(state: LevelState, idx = 0): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LEVEL_KEY(state.date, state.level, idx), JSON.stringify(state));
  } catch {}
}

export function initLevelState(
  date: string,
  level: number,
  startCode: string,
  endCode: string,
  optimalPath: string[],
  pathLength: number
): LevelState {
  return {
    date,
    level,
    guesses: [],
    status: "playing",
    hintsUsed: 0,
    startCode,
    endCode,
    optimalPath,
    pathLength,
    greenChain: [startCode],
  };
}

// ── Unlock tracking ──────────────────────────────────────────────────────────

export function getUnlockedLevel(date: string): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY(date));
    return raw ? parseInt(raw, 10) : 1;
  } catch {
    return 1;
  }
}

export function unlockNextLevel(date: string, completedLevel: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getUnlockedLevel(date);
    if (completedLevel >= current && completedLevel < 5) {
      localStorage.setItem(UNLOCKED_KEY(date), String(completedLevel + 1));
    }
  } catch {}
}

// ── Global Stats ─────────────────────────────────────────────────────────────

export function loadStats(): GlobalStats {
  if (typeof window === "undefined") {
    return defaultStats();
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return JSON.parse(raw) as GlobalStats;
  } catch {
    return defaultStats();
  }
}

function defaultStats(): GlobalStats {
  return {
    totalPlayed: 0,
    totalWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: "",
    dayHistory: [],
  };
}

export function saveStats(stats: GlobalStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

/**
 * Record the result of a single level completion.
 * Called immediately when any level is won or lost.
 */
export function recordLevelResult(won: boolean): void {
  const today = getTodayString();
  const stats = loadStats();

  stats.totalPlayed += 1;
  if (won) stats.totalWon += 1;

  if (won) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);

    if (stats.lastPlayedDate === today) {
      // Already played today — just extend streak if not already
      stats.currentStreak = Math.max(stats.currentStreak, 1);
    } else if (stats.lastPlayedDate === yStr) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.lastPlayedDate = today;
  } else {
    if (stats.lastPlayedDate !== today) {
      stats.lastPlayedDate = today;
    }
  }

  // Update today's day history entry
  const existing = stats.dayHistory.findIndex((d) => d.date === today);
  if (existing >= 0) {
    if (won) stats.dayHistory[existing].levelsCompleted += 1;
    stats.dayHistory[existing].won = stats.dayHistory[existing].won || won;
  } else {
    const dayEntry: DayStats = { date: today, levelsCompleted: won ? 1 : 0, won };
    stats.dayHistory = [...stats.dayHistory.slice(-29), dayEntry];
  }

  saveStats(stats);
}

export function recordDayResult(won: boolean, levelsCompleted: number): void {
  const today = getTodayString();
  const stats = loadStats();

  // Update streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (stats.lastPlayedDate === today) {
    // Already recorded today — just update
  } else {
    stats.totalPlayed += 1;
    if (won) stats.totalWon += 1;

    if (won) {
      if (stats.lastPlayedDate === yStr) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else {
      stats.currentStreak = 0;
    }

    stats.lastPlayedDate = today;

    const dayEntry: DayStats = { date: today, levelsCompleted, won };
    stats.dayHistory = [...stats.dayHistory.slice(-29), dayEntry];
  }

  saveStats(stats);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// ── Share string ──────────────────────────────────────────────────────────────

export function buildShareString(
  level: number,
  guesses: Guess[],
  status: "won" | "lost",
  pathLength: number
): string {
  const colorMap: Record<GuessColor, string> = {
    green: "🟩",
    orange: "🟧",
    grey: "⬜",
  };
  const squares = guesses.map((g) => colorMap[g.color]).join("");
  const maxGuesses = pathLength + 5;
  const result = status === "won" ? `${guesses.length}/${maxGuesses}` : "X";
  return `TRAVLE.EXE Level ${level} — ${result}\n${squares}`;
}
