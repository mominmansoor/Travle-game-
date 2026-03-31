"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { loadSettings, saveSettings, Settings } from "@/lib/gameState";
import { setSoundEnabled as audioSetEnabled } from "@/lib/audio";
import { applyTheme, getSavedTheme, saveTheme } from "@/lib/themeManager";

interface SettingsCtx {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  currentTheme: string;
  setTheme: (name: string) => void;
  themeVersion: number;
}

const Ctx = createContext<SettingsCtx>({
  settings: { scanlines: true, sounds: true, greenText: false },
  updateSettings: () => {},
  currentTheme: "terminal",
  setTheme: () => {},
  themeVersion: 0,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    scanlines: true,
    sounds: true,
    greenText: false,
  });
  const [currentTheme, setCurrentTheme] = useState("terminal");
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applyBodyClasses(s);
    audioSetEnabled(s.sounds);

    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  function applyBodyClasses(s: Settings) {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("scanlines", s.scanlines);
    document.body.classList.toggle("green-text", s.greenText);
  }

  function updateSettings(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
    applyBodyClasses(next);
    audioSetEnabled(next.sounds);
  }

  function setTheme(name: string) {
    setCurrentTheme(name);
    saveTheme(name);
    applyTheme(name);
    setThemeVersion((v) => v + 1);
  }

  return (
    <Ctx.Provider value={{ settings, updateSettings, currentTheme, setTheme, themeVersion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  return useContext(Ctx);
}
