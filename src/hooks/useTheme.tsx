"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "obsidian-remote-memo-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR/クライアント初回レンダリングともに"dark"で統一し、ハイドレーション不整合を防ぐ
  const [theme, setThemeState] = useState<Theme>("dark");

  // ハイドレーション後にlocalStorageから復元
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light") {
      setThemeState("light");
    }
  }, []);

  // テーマ変更時にCSS変数を切り替え
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
