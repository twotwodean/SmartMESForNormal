import { describe, it, expect } from "vitest";
import { gaugeOffset } from "@/components/ui/gauge-tile";

describe("gaugeOffset", () => {
  it("0%는 전체 둘레만큼 오프셋(빈 링)", () => {
    expect(gaugeOffset(0, 100)).toBe(100);
  });
  it("100%는 오프셋 0(꽉 찬 링)", () => {
    expect(gaugeOffset(100, 100)).toBe(0);
  });
  it("50%는 둘레의 절반", () => {
    expect(gaugeOffset(50, 100)).toBe(50);
  });
  it("범위를 벗어나면 0–100으로 클램프", () => {
    expect(gaugeOffset(-20, 100)).toBe(100);
    expect(gaugeOffset(140, 100)).toBe(0);
  });
});
