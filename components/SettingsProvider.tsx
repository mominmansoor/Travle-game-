"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, Settings } from "@/lib/gameState";
import { setSoundEnabled as audioSetEnabled } from "@/lib/audio";
import { applyTheme, getSavedTheme, saveTheme } from "@/lib/themeManager";
import { DEFAULT_THEME } from "@/data/themes";

interface SettingsCtx {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  currentTheme: string;
  setTheme: (name: string) => void;
  themeVersion: number;
}

const Ctx = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  currentTheme: DEFAULT_THEME,
  setTheme: () => {},
  themeVersion: 0,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME);
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    audioSetEnabled(s.sounds);

    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  function updateSettings(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
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
