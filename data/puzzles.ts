import { COUNTRIES } from "@/data/countries";
import { bfsPath, getNeighbors, OBSCURE_CODES } from "@/lib/bfs";

export interface Puzzle {
  start: string;
  end: string;
  optimalPath: string[];
  pathLength: number;
  level: number;
}

// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const DIFFICULTY_RANGES: Record<number, [number, number]> = {
  1: [2, 3],
  2: [4, 5],
  3: [6, 7],
  4: [8, 10],
  5: [11, 99],
};

function candidatesForLevel(level: number, ocean: boolean): string[] {
  // Any country with at least one connection can be used. With ocean
  // crossings on, that pulls in island nations like Japan or Sri Lanka.
  const eligible = COUNTRIES.filter((c) => getNeighbors(c.code, ocean).length > 0);
  if (level === 5) {
    return eligible
      .filter((c) => OBSCURE_CODES.has(c.code))
      .map((c) => c.code);
  }
  if (level === 4) {
    return eligible.map((c) => c.code);
  }
  return eligible
    .filter((c) => getNeighbors(c.code, ocean).length >= 2)
    .map((c) => c.code);
}

/**
 * Generate a puzzle for a given difficulty level using a raw numeric seed.
 * seed = sessionSeed + level * prime + puzzleIdx * prime2
 */
export function generatePuzzle(seed: number, level: number, ocean = false): Puzzle | null {
  const rng = mulberry32(seed);

  const [minLen, maxLen] = DIFFICULTY_RANGES[level];
  const candidates = candidatesForLevel(level, ocean);

  if (candidates.length < 2) return null;

  for (let attempt = 0; attempt < 500; attempt++) {
    const start = pickRandom(candidates, rng);
    const end = pickRandom(candidates, rng);
    if (start === end) continue;

    const path = bfsPath(start, end, ocean);
    if (!path) continue;

    const len = path.length - 1;
    if (len < minLen || len > maxLen) continue;

    return { start, end, optimalPath: path, pathLength: len, level };
  }

  // Fallback
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const path = bfsPath(candidates[i], candidates[j], ocean);
      if (!path) continue;
      const len = path.length - 1;
      if (len >= minLen && len <= maxLen) {
        return { start: candidates[i], end: candidates[j], optimalPath: path, pathLength: len, level };
      }
    }
  }

  return null;
}

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get or create a random seed for this browser session (resets on refresh). */
export function getSessionSeed(): number {
  if (typeof sessionStorage === "undefined") return 12345;
  const key = "travle_session_seed";
  const existing = sessionStorage.getItem(key);
  if (existing) return parseInt(existing, 10);
  const seed = Math.floor(Math.random() * 2_147_483_647) + 1;
  sessionStorage.setItem(key, String(seed));
  return seed;
}

/** Compute the seed for a specific level + puzzle index within a session. */
export function levelSeed(sessionSeed: number, level: number, idx: number): number {
  return (sessionSeed * (level * 7919) + idx * 1_000_003) >>> 0;
}
