"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";

type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggle: () => {},
});

function getStorageKey(userId: string | undefined) {
  return userId ? `theme_${userId}` : "theme_default";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>("light");

  // Load theme when user changes
  useEffect(() => {
    const key = getStorageKey(user?.id);
    const saved = localStorage.getItem(key);
    const t = saved === "dark" ? "dark" : "light";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, [user?.id]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      const key = getStorageKey(user?.id);
      localStorage.setItem(key, next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, [user?.id]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
