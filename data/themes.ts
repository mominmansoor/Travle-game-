/**
 * Each palette is a little desktop: the wallpaper, the window paper, and
 * one ink. Map states lean on patterns (solid, stripes, dither) as much as
 * colour, so even the near-monochrome palette stays readable.
 *
 * desk    wallpaper behind the window
 * paper   window background, land on the map
 * ink     outlines, text, hard shadows
 * sub     greyed-out text and the "adrift" dither
 * accent  on-course guesses and the finished route
 * warn    detours, the destination pin, errors
 * hi      small highlights (the start flag)
 * shadow  the hard drop shadow (usually the ink)
 */
export interface Theme {
  name: string;
  dark?: boolean;
  desk: string;
  paper: string;
  ink: string;
  sub: string;
  accent: string;
  warn: string;
  hi: string;
  shadow: string;
}

export const themes: Theme[] = [
  {
    name: "desktop",
    desk: "#7bc672", paper: "#f7f2e6", ink: "#262624", sub: "#a39f94",
    accent: "#6fbf66", warn: "#ec8a3c", hi: "#f2d14c", shadow: "#262624",
  },
  {
    name: "inbox",
    desk: "#33363c", paper: "#ebe5cf", ink: "#2b2d32", sub: "#8e8a7b",
    accent: "#8d9469", warn: "#2b2d32", hi: "#ebe5cf", shadow: "#17181b",
  },
  {
    name: "midnight",
    dark: true,
    desk: "#d9e3d1", paper: "#0f1b25", ink: "#dfe9d5", sub: "#5c6d76",
    accent: "#e3c254", warn: "#ee8d52", hi: "#e3c254", shadow: "#0a1219",
  },
  {
    name: "beige box",
    desk: "#cdc4b1", paper: "#f0eadd", ink: "#3a3835", sub: "#9d978b",
    accent: "#5aae49", warn: "#e1772c", hi: "#f0c443", shadow: "#3a3835",
  },
  {
    name: "blueprint",
    dark: true,
    desk: "#e9e4d8", paper: "#1f4e8c", ink: "#f2efe6", sub: "#7d9cc6",
    accent: "#8fdcb0", warn: "#ffcf5a", hi: "#ffcf5a", shadow: "#123056",
  },
];

export const themeMap = new Map<string, Theme>(themes.map((t) => [t.name, t]));
export const DEFAULT_THEME = "desktop";
