import { describe, it, expect } from "vitest";
import { ppm } from "@/lib/domain/quality";

describe("ppm", () => {
  it("불량률을 백만분율로 계산한다", () => {
    expect(ppm(3, 1000)).toBe(3000);
    expect(ppm(1, 1_000_000)).toBe(1);
  });
  it("총수량 0이면 0", () => {
    expect(ppm(5, 0)).toBe(0);
  });
  it("반올림한다", () => {
    expect(ppm(1, 3)).toBe(333333);
  });
});
