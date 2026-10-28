/**
 * Seas and oceans — guessable stops that only exist when OCEAN CROSSINGS
 * is on. Countries never connect straight across water: to get from the
 * United States to Russia you have to name the water in between
 * ("Bering Strait", or "Pacific Ocean"), and it costs a guess like any
 * other stop.
 *
 * `coasts`  — countries with a shoreline on it
 * `joins`   — other waters it opens into (straits, canals, open sea)
 * `anchor`  — [lon, lat] where it's drawn on the map
 *
 * Codes start with "~" so they can never clash with a country code.
 */
export interface Water {
  code: string;
  name: string;
  aliases?: string[];
  anchor: [number, number];
  coasts: string[];
  joins: string[];
}

export const WATERS: Water[] = [
  // ── Oceans ──
  {
    code: "~ATL", name: "Atlantic Ocean", aliases: ["Atlantic"], anchor: [-35, 25],
    coasts: [
      "US", "CA", "CU", "HT", "DO", "TT", "VE", "GY", "SR", "GF", "BR", "UY", "AR",
      "IS", "IE", "GB", "NO", "FR", "ES", "PT", "MA", "EH", "MR", "SN", "GM", "GW",
      "GN", "SL", "LR", "CI", "GH", "TG", "BJ", "NG", "CM", "GQ", "GA", "ST", "CG",
      "CD", "AO", "NA", "ZA",
    ],
    joins: ["~ARC", "~SOU", "~IND", "~GIB", "~CAR", "~GMX", "~NTH", "~ENG"],
  },
  {
    code: "~PAC", name: "Pacific Ocean", aliases: ["Pacific"], anchor: [-140, 5],
    coasts: [
      "US", "CA", "MX", "GT", "SV", "HN", "NI", "CR", "PA", "CO", "EC", "PE", "CL",
      "RU", "JP", "PH", "TW", "ID", "PG", "AU", "NZ", "PW", "FM", "MH", "KI", "NR",
      "SB", "VU", "FJ", "TO", "WS", "TV",
    ],
    joins: ["~SOU", "~IND", "~BER", "~SCS", "~ECS", "~JPN", "~COR", "~TAS", "~CAR"],
  },
  {
    code: "~IND", name: "Indian Ocean", aliases: ["Indian"], anchor: [78, -25],
    coasts: ["ZA", "MZ", "TZ", "KE", "SO", "MG", "MU", "KM", "MV", "LK", "IN", "ID", "AU"],
    joins: ["~ATL", "~PAC", "~SOU", "~ARB", "~BEN", "~AND", "~MOZ", "~TIM"],
  },
  {
    code: "~ARC", name: "Arctic Ocean", aliases: ["Arctic"], anchor: [20, 80],
    coasts: ["RU", "CA", "US", "NO"],
    joins: ["~ATL", "~BER"],
  },
  {
    code: "~SOU", name: "Southern Ocean", aliases: ["Antarctic Ocean"], anchor: [60, -60],
    coasts: ["AU", "NZ", "AR", "CL", "ZA"],
    joins: ["~ATL", "~PAC", "~IND", "~TAS"],
  },

  // ── Europe ──
  {
    code: "~MED", name: "Mediterranean Sea", aliases: ["Mediterranean", "Med"], anchor: [18, 34.5],
    coasts: [
      "ES", "FR", "MC", "IT", "MT", "SI", "HR", "BA", "ME", "AL", "GR", "TR", "CY",
      "SY", "LB", "PS", "EG", "LY", "TN", "DZ", "MA",
    ],
    joins: ["~GIB", "~ADR", "~AEG", "~RED"], // ~RED via the Suez Canal
  },
  { code: "~ADR", name: "Adriatic Sea", aliases: ["Adriatic"], anchor: [15.5, 43], coasts: ["IT", "SI", "HR", "BA", "ME", "AL"], joins: ["~MED"] },
  { code: "~AEG", name: "Aegean Sea", aliases: ["Aegean"], anchor: [25, 38.5], coasts: ["GR", "TR"], joins: ["~MED", "~BLK"] },
  { code: "~BLK", name: "Black Sea", anchor: [34, 43.3], coasts: ["TR", "BG", "RO", "UA", "RU", "GE"], joins: ["~AEG"] },
  { code: "~GIB", name: "Strait of Gibraltar", aliases: ["Gibraltar"], anchor: [-5.6, 35.95], coasts: ["ES", "MA"], joins: ["~ATL", "~MED"] },
  { code: "~NTH", name: "North Sea", anchor: [3, 56], coasts: ["GB", "NO", "DK", "DE", "NL", "BE", "FR"], joins: ["~ATL", "~ENG", "~BAL"] },
  { code: "~ENG", name: "English Channel", aliases: ["The Channel", "La Manche"], anchor: [-2, 50], coasts: ["GB", "FR"], joins: ["~ATL", "~NTH"] },
  { code: "~BAL", name: "Baltic Sea", aliases: ["Baltic"], anchor: [19, 57], coasts: ["SE", "FI", "EE", "LV", "LT", "PL", "DE", "DK", "RU"], joins: ["~NTH"] },

  // ── Middle East & Indian Ocean ──
  { code: "~CAS", name: "Caspian Sea", aliases: ["Caspian"], anchor: [50.5, 42], coasts: ["RU", "KZ", "TM", "IR", "AZ"], joins: [] },
  { code: "~RED", name: "Red Sea", anchor: [38, 20], coasts: ["EG", "SD", "ER", "DJ", "SA", "YE", "JO"], joins: ["~MED", "~ADN"] },
  { code: "~ADN", name: "Gulf of Aden", aliases: ["Aden"], anchor: [48, 12.5], coasts: ["YE", "DJ", "SO"], joins: ["~RED", "~ARB"] },
  { code: "~ARB", name: "Arabian Sea", anchor: [64, 15], coasts: ["OM", "YE", "IN", "PK", "IR", "SO", "MV"], joins: ["~ADN", "~PER", "~IND"] },
  { code: "~PER", name: "Persian Gulf", aliases: ["Arabian Gulf", "The Gulf"], anchor: [51.5, 27], coasts: ["IR", "IQ", "KW", "SA", "BH", "QA", "AE", "OM"], joins: ["~ARB"] },
  { code: "~BEN", name: "Bay of Bengal", aliases: ["Bengal"], anchor: [88, 15], coasts: ["IN", "BD", "MM", "LK"], joins: ["~IND", "~AND"] },
  { code: "~MOZ", name: "Mozambique Channel", anchor: [41, -18], coasts: ["MZ", "MG", "KM", "TZ"], joins: ["~IND"] },

  // ── East Asia & Oceania ──
  { code: "~AND", name: "Andaman Sea", aliases: ["Strait of Malacca", "Malacca"], anchor: [96, 10], coasts: ["MM", "TH", "MY", "ID", "IN"], joins: ["~BEN", "~IND", "~SCS"] },
  { code: "~SCS", name: "South China Sea", anchor: [114, 13], coasts: ["CN", "TW", "PH", "VN", "KH", "TH", "MY", "SG", "ID", "BN"], joins: ["~PAC", "~ECS", "~AND"] },
  { code: "~ECS", name: "East China Sea", anchor: [126, 29], coasts: ["CN", "TW", "JP", "KR"], joins: ["~PAC", "~SCS", "~YEL", "~JPN"] },
  { code: "~YEL", name: "Yellow Sea", anchor: [123, 36], coasts: ["CN", "KP", "KR"], joins: ["~ECS"] },
  { code: "~JPN", name: "Sea of Japan", aliases: ["East Sea"], anchor: [135, 40], coasts: ["JP", "KR", "KP", "RU"], joins: ["~PAC", "~ECS"] },
  { code: "~BER", name: "Bering Strait", aliases: ["Bering Sea", "Bering"], anchor: [-169, 65.8], coasts: ["US", "RU"], joins: ["~PAC", "~ARC"] },
  { code: "~COR", name: "Coral Sea", anchor: [155, -17], coasts: ["AU", "PG", "SB", "VU"], joins: ["~PAC", "~TAS", "~ARA"] },
  { code: "~TAS", name: "Tasman Sea", anchor: [160, -38], coasts: ["AU", "NZ"], joins: ["~PAC", "~COR", "~SOU"] },
  { code: "~TIM", name: "Timor Sea", anchor: [126, -11], coasts: ["AU", "TL", "ID"], joins: ["~IND", "~ARA"] },
  { code: "~ARA", name: "Arafura Sea", aliases: ["Torres Strait"], anchor: [136, -9.5], coasts: ["AU", "ID", "PG"], joins: ["~TIM", "~COR"] },

  // ── Americas ──
  {
    code: "~CAR", name: "Caribbean Sea", aliases: ["Caribbean"], anchor: [-75, 15],
    coasts: ["MX", "BZ", "GT", "HN", "NI", "CR", "PA", "CO", "VE", "CU", "JM", "HT", "DO", "TT"],
    joins: ["~ATL", "~GMX", "~PAC"], // ~PAC via the Panama Canal
  },
  { code: "~GMX", name: "Gulf of Mexico", anchor: [-90, 25], coasts: ["US", "MX", "CU"], joins: ["~ATL", "~CAR"] },
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

/** Neighbours of a water body: its coasts plus the waters it opens into (both directions). */
export const WATER_NEIGHBORS: Map<string, string[]> = (() => {
  const m = new Map<string, Set<string>>();
  for (const w of WATERS) m.set(w.code, new Set(w.coasts));
  for (const w of WATERS) {
    for (const j of w.joins) {
      m.get(w.code)?.add(j);
      m.get(j)?.add(w.code);
    }
  }
  return new Map(Array.from(m, ([k, v]) => [k, Array.from(v)]));
})();
