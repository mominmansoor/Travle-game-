/**
 * Palettes are named after the kinds of charts they imitate.
 *
 * bg / bgAlt  the paper, and a slightly deeper card stock for panels
 * text / sub  the ink, and faded ink for secondary marks
 * accent      "on course" guesses and the finished route
 * warn        detours, and the target pin
 * error       wrong turns and game over
 * sea / land  the two washes the map is printed with
 */
export interface Theme {
  name: string;
  dark?: boolean;
  bg: string;
  bgAlt: string;
  text: string;
  sub: string;
  accent: string;
  error: string;
  warn: string;
  sea: string;
  land: string;
}

export const themes: Theme[] = [
  {
    name: "parchment",
    bg: "#f4e9cd", bgAlt: "#ece0bf",
    text: "#2b2418", sub: "#8c7b5a",
    accent: "#3d6b45", error: "#a8322a", warn: "#b5542c",
    sea: "#cfdcd0", land: "#efe2c2",
  },
  {
    name: "admiralty",
    bg: "#eef0e8", bgAlt: "#e2e6da",
    text: "#1d2b3a", sub: "#7f8b92",
    accent: "#2f6a5b", error: "#9e2f37", warn: "#c0661f",
    sea: "#c7dbe3", land: "#f2f1e6",
  },
  {
    name: "sepia",
    bg: "#efe1c6", bgAlt: "#e5d3b2",
    text: "#3a2614", sub: "#9a7b56",
    accent: "#6b6a2a", error: "#93321f", warn: "#a6561f",
    sea: "#dccdaa", land: "#f3e6cb",
  },
  {
    name: "verdigris",
    bg: "#f1ead6", bgAlt: "#e6dec5",
    text: "#22302b", sub: "#85907f",
    accent: "#2c7466", error: "#a3392f", warn: "#b77a1f",
    sea: "#bcd7cd", land: "#f4ecd7",
  },
  {
    name: "night chart",
    dark: true,
    bg: "#151b24", bgAlt: "#1c2430",
    text: "#e8dfc8", sub: "#6d7686",
    accent: "#8fbf8a", error: "#e0705f", warn: "#e3a253",
    sea: "#121821", land: "#263142",
  },
  {
    name: "blueprint",
    dark: true,
    bg: "#173a5e", bgAlt: "#1d4670",
    text: "#eef3f7", sub: "#7f9fbd",
    accent: "#9fe0c4", error: "#ff8f80", warn: "#ffd27a",
    sea: "#163656", land: "#24527f",
  },
];

export const themeMap = new Map<string, Theme>(themes.map((t) => [t.name, t]));
export const DEFAULT_THEME = "parchment";
