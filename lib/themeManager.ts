import { themes, themeMap, DEFAULT_THEME, Theme } from "@/data/themes";

const THEME_KEY = "travle-theme";

const VARS: [string, keyof Theme][] = [
  ["--desk", "desk"],
  ["--paper", "paper"],
  ["--ink", "ink"],
  ["--sub", "sub"],
  ["--accent", "accent"],
  ["--warn", "warn"],
  ["--hi", "hi"],
  ["--shadow", "shadow"],
];

export function applyTheme(name: string): void {
  const theme: Theme = themeMap.get(name) ?? themeMap.get(DEFAULT_THEME)!;
  const r = document.documentElement;
  for (const [v, k] of VARS) r.style.setProperty(v, String(theme[k]));
  r.dataset.tone = theme.dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.desk);
}

/** Saved theme, falling back to the default if it's an old or unknown name. */
export function getSavedTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved && themeMap.has(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(name: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, name);
  } catch {}
}

export function initTheme(): void {
  applyTheme(getSavedTheme());
}

// Inline script for layout.tsx so the right palette is down before first paint.
export function buildThemeInitScript(): string {
  const data = themes.map((t) => [t.name, t.dark ? 1 : 0, ...VARS.map(([, k]) => t[k])]);
  return `(function(){try{
var v=${JSON.stringify(VARS.map(([v]) => v))};
var ts=${JSON.stringify(data)};
var n=localStorage.getItem("${THEME_KEY}")||"${DEFAULT_THEME}";
var t=ts.find(function(x){return x[0]===n;})||ts[0];
var r=document.documentElement;
for(var i=0;i<v.length;i++)r.style.setProperty(v[i],t[i+2]);
r.dataset.tone=t[1]?"dark":"light";
}catch(e){}})();`;
}
