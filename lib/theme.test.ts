import { describe, it, expect } from "vitest";
import { THEME_STORAGE_KEY, DEFAULT_THEME, nextTheme, isTheme } from "@/lib/theme";

describe("theme logic", () => {
  it("기본 테마는 dark 이다", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("스토리지 키가 정의되어 있다", () => {
    expect(THEME_STORAGE_KEY).toBe("smartmes-theme");
  });

  it("nextTheme는 dark/light를 토글한다", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });

  it("isTheme는 유효한 값만 통과시킨다", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});
