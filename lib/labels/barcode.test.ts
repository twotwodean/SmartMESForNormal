import { describe, it, expect } from "vitest";
import { barcodeSvg } from "@/lib/labels/barcode";

describe("barcodeSvg", () => {
  it("Code128 바코드 SVG 문자열을 반환한다", () => {
    const svg = barcodeSvg("LOT-TEST-001");
    expect(typeof svg).toBe("string");
    expect(svg.length).toBeGreaterThan(0);
    expect(svg).toContain("<svg");
  });

  it("반환된 SVG에 width/height 속성이 명시되어 있다", () => {
    const svg = barcodeSvg("LOT-TEST-001");
    expect(svg).toMatch(/<svg[^>]*\swidth="[\d.]+"/);
    expect(svg).toMatch(/<svg[^>]*\sheight="[\d.]+"/);
  });

  it("옵션(height/scale/includetext)을 반영해 렌더링한다", () => {
    const small = barcodeSvg("LOT-TEST-001", { scale: 1, height: 8, includetext: false });
    const large = barcodeSvg("LOT-TEST-001", { scale: 3, height: 8, includetext: false });
    expect(small).toContain("<svg");
    expect(large).toContain("<svg");
    expect(small).not.toBe(large);
  });

  it("빈 문자열이면 에러를 던진다", () => {
    expect(() => barcodeSvg("")).toThrow();
    expect(() => barcodeSvg("   ")).toThrow();
  });
});
