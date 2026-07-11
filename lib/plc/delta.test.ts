import { describe, it, expect } from "vitest";
import { counterDelta } from "@/lib/plc/delta";

describe("counterDelta", () => {
  it("정상 증가: curr > prev -> curr - prev", () => {
    expect(counterDelta(100, 105)).toBe(5);
  });

  it("변화 없음: curr === prev -> 0", () => {
    expect(counterDelta(100, 100)).toBe(0);
  });

  it("카운터 리셋/롤오버: curr < prev -> curr(리셋 이후 값)를 그대로 반환", () => {
    expect(counterDelta(1000, 3)).toBe(3);
  });

  it("최초 읽기: prev 0, curr N -> N", () => {
    expect(counterDelta(0, 42)).toBe(42);
  });

  it("음수 델타를 반환하지 않는다", () => {
    expect(counterDelta(50, 10)).toBeGreaterThanOrEqual(0);
  });
});
