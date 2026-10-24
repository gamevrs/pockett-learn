"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { sound } from "@/lib/sound/sound";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "pockett_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check saved preference or system preference
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
        applyThemeClass(saved);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setThemeState(initial);
        applyThemeClass(initial);
      }
    } catch {
      // Default to light
    }
    setMounted(true);
  }, []);

  const applyThemeClass = (nextTheme: Theme) => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (nextTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyThemeClass(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (e) {
      console.error("Failed to save theme preference", e);
    }
    window.dispatchEvent(
      new CustomEvent("pockett_theme_changed", { detail: { theme: nextTheme } })
    );
  };

  const toggleTheme = () => {
    sound.playClick();
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
