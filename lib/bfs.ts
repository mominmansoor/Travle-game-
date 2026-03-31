import { COUNTRY_MAP } from "@/data/countries";

/**
 * BFS shortest path between two country codes.
 * Returns the full path as an array of codes, or null if unreachable.
 */
export function bfsPath(start: string, end: string): string[] | null {
  if (start === end) return [start];
  const visited = new Set<string>();
  const queue: { code: string; path: string[] }[] = [{ code: start, path: [start] }];
  visited.add(start);

  while (queue.length > 0) {
    const { code, path } = queue.shift()!;
    const country = COUNTRY_MAP.get(code);
    if (!country) continue;
    for (const neighbor of country.neighbors) {
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
export function shortestPathLength(start: string, end: string): number {
  const path = bfsPath(start, end);
  if (!path) return Infinity;
  return path.length - 1; // edges = nodes - 1
}

/**
 * Evaluate a guess under the open-guess system.
 *
 * Every valid country name is always accepted — no border checking,
 * no rejection. The colour is purely informational feedback.
 *
 * GREEN  — guess directly borders lastGreen AND reduces BFS(→END) by 1
 *          (the only type that extends the winning green chain)
 * ORANGE — within 2 extra steps of optimal from lastGreen's position
 * GREY   — 3+ extra steps away, unreachable island, or dead end
 *
 * "extra cost" = BFS(lastGreen→guess) + BFS(guess→END) − BFS(lastGreen→END)
 * (triangle-inequality excess; always >= 0)
 */
export type GuessResult = "green" | "orange" | "grey";

export function evaluateGuess(
  guessCode: string,
  lastGreenCode: string,
  endCode: string
): GuessResult {
  const distGuessToEnd = shortestPathLength(guessCode, endCode);
  if (distGuessToEnd === Infinity) return "grey";

  const distLastGreenToEnd = shortestPathLength(lastGreenCode, endCode);

  const lastGreenNeighbors = COUNTRY_MAP.get(lastGreenCode)?.neighbors ?? [];
  const directBorder = lastGreenNeighbors.includes(guessCode);

  // GREEN: direct border AND one step closer on an optimal path
  if (directBorder && distGuessToEnd === distLastGreenToEnd - 1) return "green";

  // Excess detour cost for orange/grey
  const distLastGreenToGuess = shortestPathLength(lastGreenCode, guessCode);
  if (distLastGreenToGuess === Infinity) return "grey";

  const extra = distLastGreenToGuess + distGuessToEnd - distLastGreenToEnd;
  return extra <= 2 ? "orange" : "grey";
}

/**
 * Check if there's a connected path from start to end using only
 * the countries in guessedCodes (plus start itself).
 * Returns the path if connected, null otherwise.
 */
export function findConnectedPath(
  guessedCodes: string[],
  startCode: string,
  endCode: string
): string[] | null {
  const allowed = new Set(guessedCodes);
  allowed.add(startCode);

  const visited = new Set<string>();
  const queue: { code: string; path: string[] }[] = [{ code: startCode, path: [startCode] }];
  visited.add(startCode);

  // Check if startCode itself borders endCode
  const startCountry = COUNTRY_MAP.get(startCode);
  if (startCountry?.neighbors.includes(endCode)) return [startCode, endCode];

  while (queue.length > 0) {
    const { code, path } = queue.shift()!;
    const country = COUNTRY_MAP.get(code);
    if (!country) continue;
    for (const neighbor of country.neighbors) {
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
export function buildDistanceCache(codes: string[]): Map<string, number> {
  const cache = new Map<string, number>();
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const dist = shortestPathLength(codes[i], codes[j]);
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
