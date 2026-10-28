/**
 * Sea crossings — extra edges used only when "OCEAN CROSSINGS" is turned on.
 *
 * Each pair is a short, recognisable hop across a strait, channel or
 * island chain (ferries, causeways, narrow seas). Long open-ocean jumps
 * like the Atlantic are deliberately left out so the game stays about
 * geography rather than "everything touches everything".
 *
 * Pairs are undirected: listing [A, B] links A→B and B→A.
 */
export const SEA_LINKS: [string, string][] = [
  // ── North Pacific / Bering Strait ──
  ["US", "RU"], // Bering Strait (Alaska ↔ Chukotka)

  // ── North Atlantic & North Sea ──
  ["GB", "FR"], // English Channel
  ["GB", "BE"],
  ["GB", "NL"],
  ["IE", "FR"],
  ["IS", "GB"],
  ["IS", "NO"],
  ["DK", "NO"], // Skagerrak
  ["DK", "SE"], // Øresund

  // ── Baltic ──
  ["SE", "DE"],
  ["SE", "PL"],
  ["SE", "LT"],
  ["SE", "LV"],
  ["SE", "EE"],
  ["FI", "EE"], // Gulf of Finland

  // ── Mediterranean ──
  ["ES", "MA"], // Strait of Gibraltar
  ["ES", "DZ"],
  ["IT", "TN"], // Sicily ↔ Cap Bon
  ["IT", "MT"],
  ["MT", "TN"],
  ["MT", "LY"],
  ["IT", "AL"], // Strait of Otranto
  ["IT", "GR"],
  ["IT", "HR"],
  ["IT", "ME"],
  ["CY", "TR"],
  ["CY", "GR"],
  ["CY", "SY"],
  ["CY", "LB"],
  ["CY", "EG"],

  // ── Black Sea ──
  ["TR", "UA"],
  ["TR", "RU"],
  ["TR", "RO"],

  // ── Red Sea / Gulf of Aden ──
  ["EG", "SA"],
  ["SD", "SA"],
  ["ER", "YE"],
  ["DJ", "YE"], // Bab-el-Mandeb
  ["SO", "YE"],

  // ── Persian Gulf ──
  ["BH", "SA"], // King Fahd Causeway
  ["BH", "QA"],
  ["IR", "AE"],
  ["IR", "OM"], // Strait of Hormuz
  ["IR", "QA"],
  ["IR", "KW"],

  // ── Indian Ocean ──
  ["IN", "LK"], // Palk Strait
  ["IN", "MV"],
  ["LK", "MV"],
  ["MZ", "MG"], // Mozambique Channel
  ["MZ", "KM"],
  ["TZ", "KM"],
  ["MG", "KM"],
  ["MG", "MU"],

  // ── Gulf of Guinea ──
  ["ST", "GA"],
  ["ST", "GQ"],

  // ── East Asia ──
  ["JP", "KR"], // Korea Strait
  ["JP", "RU"], // La Pérouse Strait (Hokkaido ↔ Sakhalin)
  ["JP", "TW"], // Ryukyu chain
  ["KR", "CN"],
  ["TW", "CN"], // Taiwan Strait
  ["TW", "PH"], // Luzon Strait

  // ── Southeast Asia ──
  ["PH", "MY"],
  ["PH", "ID"],
  ["SG", "ID"],

  // ── Australia & Pacific ──
  ["AU", "ID"],
  ["AU", "PG"], // Torres Strait
  ["AU", "TL"],
  ["AU", "NZ"], // Tasman Sea
  ["NZ", "FJ"],
  ["PG", "SB"],
  ["SB", "VU"],
  ["VU", "FJ"],
  ["FJ", "TO"],
  ["FJ", "TV"],
  ["TO", "WS"],
  ["WS", "TV"],
  ["TV", "KI"],
  ["KI", "NR"],
  ["KI", "MH"],
  ["NR", "MH"],
  ["MH", "FM"],
  ["FM", "PW"],
  ["PW", "PH"],
  ["PW", "ID"],

  // ── Caribbean ──
  ["CU", "US"], // Florida Straits
  ["CU", "MX"], // Yucatán Channel
  ["CU", "HT"], // Windward Passage
  ["CU", "JM"],
  ["JM", "HT"],
  ["TT", "VE"],
];

/** Adjacency map built from SEA_LINKS (both directions). */
export const SEA_NEIGHBORS: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = map.get(a) ?? [];
    if (!list.includes(b)) list.push(b);
    map.set(a, list);
  };
  for (const [a, b] of SEA_LINKS) {
    add(a, b);
    add(b, a);
  }
  return map;
})();

export function isSeaLink(a: string, b: string): boolean {
  return SEA_NEIGHBORS.get(a)?.includes(b) ?? false;
}
