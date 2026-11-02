/**
 * Seas and straits: guessable stops that only exist in "Land & sea" mode.
 *
 * Countries are never linked straight across water. To cross, you name the
 * water itself, and it costs a guess like any other stop: Malaysia →
 * South China Sea → Philippines.
 *
 * Every entry here is deliberately small and local:
 *  - straits and narrow seas between neighbours (Gibraltar, Bab-el-Mandeb…)
 *  - the seas that reach islands you can't get to by land (Japan, Sri
 *    Lanka, Australia, the Philippines, the Caribbean…)
 *
 * There are no big oceans that touch half the world, and seas never open
 * into each other, so water can't be used as a shortcut across a continent.
 * The one exception is a "Pacific Islands" hop that only joins the small
 * island nations to each other.
 *
 * `coasts`  countries on it (keep this short and nearby)
 * `anchor`  [lon, lat] where it's drawn on the map
 *
 * Codes start with "~" so they can never clash with a country code.
 */
export interface Water {
  code: string;
  name: string;
  aliases?: string[];
  anchor: [number, number];
  coasts: string[];
}

export const WATERS: Water[] = [
  // ── Europe and the Mediterranean ──
  { code: "~GIB", name: "Strait of Gibraltar", aliases: ["Gibraltar"], anchor: [-5.6, 35.95], coasts: ["ES", "MA"] },
  { code: "~ENG", name: "English Channel", aliases: ["The Channel", "La Manche", "Strait of Dover"], anchor: [-1.5, 50.2], coasts: ["GB", "FR"] },
  { code: "~ORE", name: "Øresund", aliases: ["Oresund", "The Sound"], anchor: [12.7, 55.9], coasts: ["DK", "SE"] },
  { code: "~MLT", name: "Malta Channel", aliases: ["Strait of Sicily"], anchor: [14.6, 36.4], coasts: ["MT", "IT"] },
  { code: "~LEV", name: "Levantine Sea", anchor: [33.5, 34.6], coasts: ["CY", "TR", "SY", "LB"] },
  { code: "~NOR", name: "Norwegian Sea", anchor: [-2, 67], coasts: ["IS", "NO"] },

  // ── Middle East ──
  { code: "~BAB", name: "Bab-el-Mandeb", aliases: ["Bab el Mandeb", "Gate of Tears"], anchor: [43.3, 12.6], coasts: ["YE", "DJ", "ER"] },
  { code: "~TIR", name: "Strait of Tiran", aliases: ["Tiran"], anchor: [34.45, 27.95], coasts: ["EG", "SA"] },
  { code: "~HOR", name: "Strait of Hormuz", aliases: ["Hormuz"], anchor: [56.4, 26.5], coasts: ["IR", "OM"] },
  { code: "~BAH", name: "Gulf of Bahrain", anchor: [50.7, 25.8], coasts: ["BH", "SA", "QA"] },

  // ── Africa ──
  { code: "~MOZ", name: "Mozambique Channel", aliases: ["Mozambique Strait"], anchor: [41.5, -18], coasts: ["MZ", "MG", "KM"] },
  { code: "~BIA", name: "Bight of Biafra", aliases: ["Bight of Bonny"], anchor: [7.6, 2.2], coasts: ["ST", "GQ", "CM", "GA"] },

  // ── South Asia ──
  { code: "~PLK", name: "Palk Strait", aliases: ["Palk Bay"], anchor: [79.6, 9.9], coasts: ["IN", "LK"] },
  { code: "~LAC", name: "Laccadive Sea", aliases: ["Lakshadweep Sea"], anchor: [75.5, 7], coasts: ["MV", "IN", "LK"] },

  // ── East and Southeast Asia ──
  { code: "~SCS", name: "South China Sea", aliases: ["East Sea", "West Philippine Sea"], anchor: [114, 12], coasts: ["CN", "TW", "VN", "MY", "BN", "ID", "PH"] },
  { code: "~CEL", name: "Celebes Sea", aliases: ["Sulawesi Sea"], anchor: [122.5, 4], coasts: ["PH", "ID", "MY"] },
  { code: "~SUL", name: "Sulu Sea", anchor: [120, 8.5], coasts: ["PH", "MY"] },
  { code: "~MAL", name: "Strait of Malacca", aliases: ["Malacca"], anchor: [99.5, 4], coasts: ["MY", "ID"] },
  { code: "~TWS", name: "Taiwan Strait", aliases: ["Formosa Strait"], anchor: [119.6, 24.2], coasts: ["CN", "TW"] },
  { code: "~LUZ", name: "Luzon Strait", aliases: ["Bashi Channel"], anchor: [121.2, 20.5], coasts: ["TW", "PH"] },
  { code: "~ECS", name: "East China Sea", anchor: [126, 29.5], coasts: ["CN", "TW", "JP", "KR"] },
  { code: "~JPN", name: "Sea of Japan", aliases: ["East Sea of Korea"], anchor: [134, 40], coasts: ["JP", "KR", "KP", "RU"] },
  { code: "~KOR", name: "Korea Strait", aliases: ["Tsushima Strait"], anchor: [129.2, 34.4], coasts: ["KR", "JP"] },
  { code: "~PHS", name: "Philippine Sea", anchor: [133, 18], coasts: ["PH", "TW", "JP", "PW"] },

  // ── Australia and the Pacific ──
  { code: "~TIM", name: "Timor Sea", anchor: [127.5, -11.5], coasts: ["TL", "ID", "AU"] },
  { code: "~ARA", name: "Arafura Sea", anchor: [135.5, -9.5], coasts: ["AU", "ID", "PG"] },
  { code: "~TOR", name: "Torres Strait", anchor: [142.5, -10.2], coasts: ["AU", "PG"] },
  { code: "~COR", name: "Coral Sea", anchor: [152, -16], coasts: ["AU", "PG", "SB", "VU"] },
  { code: "~SOL", name: "Solomon Sea", anchor: [152.5, -8], coasts: ["PG", "SB"] },
  { code: "~TAS", name: "Tasman Sea", anchor: [160, -38], coasts: ["AU", "NZ"] },
  {
    code: "~PIS", name: "Pacific Islands", aliases: ["Pacific", "Pacific Ocean", "Oceania", "South Pacific"],
    anchor: [178, 3],
    // island nations only, so it can't be used as a shortcut between continents
    coasts: ["PW", "FM", "MH", "KI", "NR", "SB", "VU", "FJ", "TV", "WS", "TO", "NZ"],
  },

  // ── The Americas ──
  { code: "~BER", name: "Bering Strait", aliases: ["Bering Sea"], anchor: [-169, 65.8], coasts: ["US", "RU"] },
  { code: "~FLA", name: "Straits of Florida", aliases: ["Florida Straits", "Florida Strait"], anchor: [-81, 23.9], coasts: ["US", "CU"] },
  { code: "~YUC", name: "Yucatán Channel", aliases: ["Yucatan Channel"], anchor: [-85.8, 21.6], coasts: ["MX", "CU"] },
  { code: "~WIN", name: "Windward Passage", anchor: [-73.9, 19.9], coasts: ["CU", "HT"] },
  { code: "~JAM", name: "Jamaica Channel", anchor: [-75.3, 18.2], coasts: ["JM", "HT"] },
  { code: "~PAR", name: "Gulf of Paria", aliases: ["Paria"], anchor: [-61.9, 10.4], coasts: ["TT", "VE"] },
];

export const WATER_MAP = new Map<string, Water>(WATERS.map((w) => [w.code, w]));

export const isWater = (code: string) => code.startsWith("~");

/** For each country, the waters on its coast. */
export const COAST_WATERS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const w of WATERS) {
    for (const c of w.coasts) m.set(c, [...(m.get(c) ?? []), w.code]);
  }
  return m;
})();

/** Neighbours of a water body: just its own coasts. Seas never open into each other. */
export const WATER_NEIGHBORS: Map<string, string[]> = new Map(WATERS.map((w) => [w.code, w.coasts]));
