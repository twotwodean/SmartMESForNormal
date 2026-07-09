"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { type Theme, THEME_STORAGE_KEY, DEFAULT_THEME, nextTheme, isTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) {
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  function toggle() {
    const next = nextTheme(theme);
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-body-sm text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      테마
    </button>
  );
}
