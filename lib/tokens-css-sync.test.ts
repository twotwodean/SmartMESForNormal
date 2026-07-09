import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEMANTIC_COLORS, NEUTRAL_COLORS } from "@/lib/design-tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

/** globals.css에서 특정 셀렉터 블록의 본문을 추출 */
function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`셀렉터 블록을 찾지 못함: ${selector}`);
  return m[1];
}

/** 블록에서 CSS 변수의 hex 값 추출(대문자 정규화) */
function cssVar(body: string, name: string): string {
  const m = body.match(new RegExp("--" + name + ":\\s*(#[0-9A-Fa-f]{6})"));
  if (!m) throw new Error(`변수를 찾지 못함: --${name}`);
  return m[1].toUpperCase();
}

describe("토큰 ↔ globals.css 정합성", () => {
  const darkBody = block(':root[data-theme="dark"]');
  const lightBody = block(':root[data-theme="light"]');

  it("의미색이 다크/라이트 블록과 일치한다", () => {
    for (const [key, val] of Object.entries(SEMANTIC_COLORS)) {
      expect(cssVar(darkBody, key)).toBe(val.dark.toUpperCase());
      expect(cssVar(lightBody, key)).toBe(val.light.toUpperCase());
    }
  });

  it("중립색(bg/surface/elevated/border)이 일치한다", () => {
    const keys = ["bg", "surface", "elevated", "border"] as const;
    for (const k of keys) {
      expect(cssVar(darkBody, k)).toBe(NEUTRAL_COLORS.dark[k].toUpperCase());
      expect(cssVar(lightBody, k)).toBe(NEUTRAL_COLORS.light[k].toUpperCase());
    }
  });
});
