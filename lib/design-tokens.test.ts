import { describe, it, expect } from "vitest";
import { SEMANTIC_COLORS, SPACING_SCALE, TYPE_SCALE } from "@/lib/design-tokens";

describe("design tokens", () => {
  it("의미색 6종을 다크/라이트 hex로 정의한다", () => {
    const keys = ["primary", "ok", "warn", "crit", "info", "neutral"] as const;
    for (const k of keys) {
      expect(SEMANTIC_COLORS[k].dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(SEMANTIC_COLORS[k].light).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("primary 값이 확정 스펙과 일치한다", () => {
    expect(SEMANTIC_COLORS.primary.dark).toBe("#3B82F6");
    expect(SEMANTIC_COLORS.primary.light).toBe("#2563EB");
  });

  it("간격 스케일은 4px 기반 오름차순이다", () => {
    expect(SPACING_SCALE).toEqual([4, 8, 12, 16, 24, 32, 48]);
  });

  it("타이포 스케일은 label~h1을 포함한다", () => {
    expect(TYPE_SCALE.label).toBe(11);
    expect(TYPE_SCALE.h1).toBe(30);
  });
});
