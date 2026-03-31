export interface Theme {
  name: string;
  bg: string;
  bgAlt: string;
  text: string;
  sub: string;
  accent: string;
  error: string;
  warn: string;  // detour guesses, TARGET indicator, secondary highlights
  scanlineOpacity: number;
}

export const themes: Theme[] = [
  {
    name: "terminal",
    bg: "#0a0a0a", bgAlt: "#111111",
    text: "#ffffff", sub: "#444444",
    accent: "#00ff41", error: "#ff3333", warn: "#ff8c00",
    scanlineOpacity: 0.05,
  },
  {
    name: "dracula",
    bg: "#282a36", bgAlt: "#44475a",
    text: "#f8f8f2", sub: "#6272a4",
    accent: "#50fa7b", error: "#ff5555", warn: "#ffb86c",
    scanlineOpacity: 0.04,
  },
  {
    name: "catppuccin mocha",
    bg: "#1e1e2e", bgAlt: "#313244",
    text: "#cdd6f4", sub: "#585b70",
    accent: "#a6e3a1", error: "#f38ba8", warn: "#fab387",
    scanlineOpacity: 0.04,
  },
  {
    name: "nord",
    bg: "#2e3440", bgAlt: "#3b4252",
    text: "#eceff4", sub: "#4c566a",
    accent: "#88c0d0", error: "#bf616a", warn: "#d08770",
    scanlineOpacity: 0.04,
  },
  {
    name: "gruvbox dark",
    bg: "#282828", bgAlt: "#3c3836",
    text: "#ebdbb2", sub: "#665c54",
    accent: "#b8bb26", error: "#cc241d", warn: "#fe8019",
    scanlineOpacity: 0.04,
  },
  {
    name: "tokyo night",
    bg: "#1a1b26", bgAlt: "#24283b",
    text: "#c0caf5", sub: "#414868",
    accent: "#7dcfff", error: "#f7768e", warn: "#ff9e64",
    scanlineOpacity: 0.04,
  },
  {
    name: "rose pine",
    bg: "#191724", bgAlt: "#1f1d2e",
    text: "#e0def4", sub: "#403d52",
    accent: "#31748f", error: "#eb6f92", warn: "#f6c177",
    scanlineOpacity: 0.04,
  },
  {
    name: "one dark",
    bg: "#282c34", bgAlt: "#3e4451",
    text: "#abb2bf", sub: "#5c6370",
    accent: "#98c379", error: "#e06c75", warn: "#d19a66",
    scanlineOpacity: 0.04,
  },
  {
    name: "monokai",
    bg: "#272822", bgAlt: "#3e3d32",
    text: "#f8f8f2", sub: "#75715e",
    accent: "#a6e22e", error: "#f92672", warn: "#fd971f",
    scanlineOpacity: 0.04,
  },
  {
    name: "solarized dark",
    bg: "#002b36", bgAlt: "#073642",
    text: "#839496", sub: "#586e75",
    accent: "#859900", error: "#dc322f", warn: "#cb4b16",
    scanlineOpacity: 0.04,
  },
  {
    name: "cyberpunk",
    bg: "#0d0d0d", bgAlt: "#1a0a2e",
    text: "#00ffff", sub: "#4a0080",
    accent: "#ff00ff", error: "#ff0040", warn: "#ff8800",
    scanlineOpacity: 0.06,
  },
  {
    name: "matrix",
    bg: "#000000", bgAlt: "#0a1a0a",
    text: "#00ff41", sub: "#003300",
    accent: "#00cc33", error: "#ff0000", warn: "#ffaa00",
    scanlineOpacity: 0.06,
  },
  {
    name: "amber",
    bg: "#0c0900", bgAlt: "#1a1200",
    text: "#ffb000", sub: "#4a3200",
    accent: "#ffd000", error: "#ff4400", warn: "#ff8800",
    scanlineOpacity: 0.06,
  },
  {
    name: "iceberg",
    bg: "#161821", bgAlt: "#1e2132",
    text: "#c6c8d1", sub: "#444b71",
    accent: "#84a0c6", error: "#e27878", warn: "#e2a478",
    scanlineOpacity: 0.04,
  },
  {
    name: "ayu mirage",
    bg: "#1f2430", bgAlt: "#2a3244",
    text: "#cbccc6", sub: "#3d4a5c",
    accent: "#ffcc66", error: "#f28779", warn: "#ffaa33",
    scanlineOpacity: 0.04,
  },
  {
    name: "palenight",
    bg: "#292d3e", bgAlt: "#34324a",
    text: "#a6accd", sub: "#4e5579",
    accent: "#c3e88d", error: "#f07178", warn: "#ffcb6b",
    scanlineOpacity: 0.04,
  },
  {
    name: "synthwave",
    bg: "#262335", bgAlt: "#2a2139",
    text: "#ffffff", sub: "#495495",
    accent: "#f97e72", error: "#fe4450", warn: "#fede5d",
    scanlineOpacity: 0.05,
  },
  {
    name: "retro",
    bg: "#1e1e1e", bgAlt: "#2d2d2d",
    text: "#d4b896", sub: "#4a3728",
    accent: "#e8a87c", error: "#d65c5c", warn: "#c8956c",
    scanlineOpacity: 0.05,
  },
  {
    name: "coral",
    bg: "#0f1923", bgAlt: "#1a2a38",
    text: "#e8d5b7", sub: "#2a3f52",
    accent: "#ff6b6b", error: "#ff4757", warn: "#ffa07a",
    scanlineOpacity: 0.04,
  },
  {
    name: "cobalt",
    bg: "#002240", bgAlt: "#003366",
    text: "#ffffff", sub: "#004080",
    accent: "#0088ff", error: "#ff4444", warn: "#ff9d00",
    scanlineOpacity: 0.05,
  },
];

export const themeMap = new Map<string, Theme>(themes.map((t) => [t.name, t]));
export const DEFAULT_THEME = "terminal";
