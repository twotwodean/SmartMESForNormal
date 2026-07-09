import { describe, it, expect } from "vitest";
import { sparklinePoints } from "@/components/ui/sparkline";

describe("sparklinePoints", () => {
  it("값들을 width/height에 맞는 좌표 문자열로 변환한다", () => {
    const pts = sparklinePoints([0, 5, 10], { width: 20, height: 10 });
    // x: 0,10,20 / y(반전): 10,5,0
    expect(pts).toBe("0,10 10,5 20,0");
  });

  it("모든 값이 같으면 중앙선으로 그린다", () => {
    const pts = sparklinePoints([4, 4, 4], { width: 20, height: 10 });
    expect(pts).toBe("0,5 10,5 20,5");
  });

  it("값이 1개 이하면 빈 문자열", () => {
    expect(sparklinePoints([7], { width: 20, height: 10 })).toBe("");
    expect(sparklinePoints([], { width: 20, height: 10 })).toBe("");
  });
});
