import { COUNTRY_MAP } from "@/data/countries";
import { COAST_WATERS, WATER_NEIGHBORS, isWater } from "@/data/waters";

/**
 * Neighbours of a node. Land borders always count. With `ocean` on,
 * countries also touch the seas/oceans on their coast, and waters touch
 * their coasts and each other — but two countries are never linked
 * straight across water: the sea itself has to be named as a stop.
 */
export function getNeighbors(code: string, ocean = false): string[] {
  if (isWater(code)) return ocean ? WATER_NEIGHBORS.get(code) ?? [] : [];
  const land = COUNTRY_MAP.get(code)?.neighbors ?? [];
  if (!ocean) return land;
  const sea = COAST_WATERS.get(code) ?? [];
  return sea.length ? [...land, ...sea] : land;
}

/**
 * BFS shortest path between two country codes.
 * Returns the full path as an array of codes, or null if unreachable.
 */
export function bfsPath(start: string, end: string, ocean = false): string[] | null {
  if (start === end) return [start];
  const visited = new Set<string>();
  const queue: { code: string; path: string[] }[] = [{ code: start, path: [start] }];
  visited.add(start);

  while (queue.length > 0) {
    const { code, path } = queue.shift()!;
    for (const neighbor of getNeighbors(code, ocean)) {
      if (visited.has(neighbor)) continue;
      const newPath = [...path, neighbor];
      if (neighbor === end) return newPath;
      visited.add(neighbor);
      queue.push({ code: neighbor, path: newPath });
    }
  }
  return null;
}

/** Returns just the shortest path length (edges), or Infinity if unreachable */
export function shortestPathLength(start: string, end: string, ocean = false): number {
  const path = bfsPath(start, end, ocean);
  if (!path) return Infinity;
  return path.length - 1; // edges = nodes - 1
}

/**
 * Countries you're currently "standing on": the start plus every guessed
 * country linked to it through other guesses. The target never counts.
 */
export function connectedComponent(
  guessedCodes: string[],
  startCode: string,
  endCode: string,
  ocean = false
): Set<string> {
  const allowed = new Set(guessedCodes);
  allowed.delete(endCode);
  const seen = new Set<string>([startCode]);
  const queue = [startCode];
  while (queue.length) {
    const code = queue.shift()!;
    for (const n of getNeighbors(code, ocean)) {
      if (allowed.has(n) && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

/**
 * Multi-source BFS: shortest path from ANY country in `from` to `end`.
 * Returns the path (first element is in `from`), or null.
 */
export function pathFromSet(from: Set<string>, end: string, ocean = false): string[] | null {
  if (from.has(end)) return [end];
  const prev = new Map<string, string | null>();
  const queue: string[] = [];
  from.forEach((c) => {
    prev.set(c, null);
    queue.push(c);
  });
  while (queue.length) {
    const code = queue.shift()!;
    for (const n of getNeighbors(code, ocean)) {
      if (prev.has(n)) continue;
      prev.set(n, code);
      if (n === end) {
        const path = [n];
        let cur: string | null = code;
        while (cur) {
          path.unshift(cur);
          cur = prev.get(cur) ?? null;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

/**
 * Evaluate a guess under the open-guess system.
 *
 * Every valid country name is always accepted — no border checking,
 * no rejection. The colour is purely informational feedback, measured
 * from everything you've already connected to the start (not just the
 * last green), so an out-of-order guess that later links up still counts.
 *
 * GREEN  — borders your connected chain AND is one step closer to the target
 * ORANGE — within 2 extra steps of the best route from your chain
 * GREY   — 3+ extra steps away, unreachable island, or dead end
 *
 * "extra cost" = BFS(chain→guess) + BFS(guess→END) − BFS(chain→END)
 */
export type GuessResult = "green" | "orange" | "grey";

export function evaluateGuess(
  guessCode: string,
  chain: Set<string>,
  endCode: string,
  ocean = false
): GuessResult {
  const distGuessToEnd = shortestPathLength(guessCode, endCode, ocean);
  if (distGuessToEnd === Infinity) return "grey";

  const toEnd = pathFromSet(chain, endCode, ocean);
  if (!toEnd) return "grey";
  const distChainToEnd = toEnd.length - 1;

  let bordersChain = false;
  chain.forEach((c) => {
    if (!bordersChain && getNeighbors(c, ocean).includes(guessCode)) bordersChain = true;
  });

  // GREEN: touches the chain AND one step closer on a shortest route
  if (bordersChain && distGuessToEnd === distChainToEnd - 1) return "green";

  const toGuess = pathFromSet(chain, guessCode, ocean);
  if (!toGuess) return "grey";
  const extra = toGuess.length - 1 + distGuessToEnd - distChainToEnd;
  return extra <= 2 ? "orange" : "grey";
}

/**
 * The next country to aim for: the first unguessed stop on a shortest
 * route from your connected chain to the target.
 */
export function nextStop(
  guessedCodes: string[],
  startCode: string,
  endCode: string,
  ocean = false
): string | null {
  const chain = connectedComponent(guessedCodes, startCode, endCode, ocean);
  const path = pathFromSet(chain, endCode, ocean);
  if (!path || path.length < 2) return null;
  return path[1] === endCode ? null : path[1];
}

/**
 * Check if there's a connected path from start to end using only
 * the countries in guessedCodes (plus start itself).
 * Returns the path if connected, null otherwise.
 */
export function findConnectedPath(
  guessedCodes: string[],
  startCode: string,
  endCode: string,
  ocean = false
): string[] | null {
  const allowed = new Set(guessedCodes);
  allowed.add(startCode);

  const visited = new Set<string>();
  const queue: { code: string; path: string[] }[] = [{ code: startCode, path: [startCode] }];
  visited.add(startCode);

  // Check if startCode itself borders endCode
  if (getNeighbors(startCode, ocean).includes(endCode)) return [startCode, endCode];

  while (queue.length > 0) {
    const { code, path } = queue.shift()!;
    for (const neighbor of getNeighbors(code, ocean)) {
      // Win as soon as any reachable guessed country borders endCode
      if (neighbor === endCode) return [...path, endCode];
      if (!allowed.has(neighbor) || visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push({ code: neighbor, path: [...path, neighbor] });
    }
  }
  return null;
}

/**
 * Pre-compute all ELIGIBLE countries' pairwise BFS distances
 * for a given list of codes. Used for puzzle generation.
 * Returns a Map<"A-B", number> for quick lookup.
 */
export function buildDistanceCache(codes: string[], ocean = false): Map<string, number> {
  const cache = new Map<string, number>();
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const dist = shortestPathLength(codes[i], codes[j], ocean);
      if (dist !== Infinity) {
        cache.set(`${codes[i]}-${codes[j]}`, dist);
        cache.set(`${codes[j]}-${codes[i]}`, dist);
      }
    }
  }
  return cache;
}

/** Quick lookup from a pre-built cache */
export function cachedDistance(
  cache: Map<string, number>,
  a: string,
  b: string
): number {
  return cache.get(`${a}-${b}`) ?? Infinity;
}

// Countries considered "obscure" for NIGHTMARE difficulty
export const OBSCURE_CODES = new Set([
  "LS", "SZ", "SM", "VA", "MC", "AD", "LI",
  "GW", "GM", "GQ", "ST", "KM", "DJ",
  "BT", "TL", "BN", "MV", "LK", "SG",
  "KW", "QA", "BH",
  "TT", "JM",
  "XK", "MD", "BY",
  "EH", "SS",
]);
