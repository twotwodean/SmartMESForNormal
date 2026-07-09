export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "smartmes-theme";
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/** 저장값 > 없으면 기본(dark). SSR/CSR 공통 사용. */
export function resolveTheme(stored: unknown): Theme {
  return isTheme(stored) ? stored : DEFAULT_THEME;
}
