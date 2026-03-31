import { themes, themeMap, DEFAULT_THEME, Theme } from "@/data/themes";

const THEME_KEY = "travle-theme";

export function applyTheme(name: string): void {
  const theme: Theme = themeMap.get(name) ?? themeMap.get(DEFAULT_THEME)!;
  const r = document.documentElement;
  r.style.setProperty("--bg",      theme.bg);
  r.style.setProperty("--bg-alt",  theme.bgAlt);
  r.style.setProperty("--text",    theme.text);
  r.style.setProperty("--sub",     theme.sub);
  r.style.setProperty("--accent",  theme.accent);
  r.style.setProperty("--error",   theme.error);
  r.style.setProperty("--warn",    theme.warn);
  r.style.setProperty("--scanline-opacity", String(theme.scanlineOpacity));
}

export function getSavedTheme(): string {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return localStorage.getItem(THEME_KEY) ?? DEFAULT_THEME;
}

export function saveTheme(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, name);
}

export function initTheme(): void {
  applyTheme(getSavedTheme());
}

// Inline script string for layout.tsx to prevent flash-of-unstyled-content.
// Embeds a minimal copy of the theme data so it runs before React hydrates.
export function buildThemeInitScript(): string {
  const themesData = themes.map((t) => ({
    n: t.name,
    bg: t.bg,
    ba: t.bgAlt,
    tx: t.text,
    su: t.sub,
    ac: t.accent,
    er: t.error,
    wn: t.warn,
    so: t.scanlineOpacity,
  }));
  return `(function(){try{
var k="${THEME_KEY}",d="${DEFAULT_THEME}";
var n=localStorage.getItem(k)||d;
var ts=${JSON.stringify(themesData)};
var t=ts.find(function(x){return x.n===n;})||ts[0];
var r=document.documentElement;
r.style.setProperty("--bg",t.bg);
r.style.setProperty("--bg-alt",t.ba);
r.style.setProperty("--text",t.tx);
r.style.setProperty("--sub",t.su);
r.style.setProperty("--accent",t.ac);
r.style.setProperty("--error",t.er);
r.style.setProperty("--warn",t.wn);
r.style.setProperty("--scanline-opacity",String(t.so));
}catch(e){}})();`;
}
