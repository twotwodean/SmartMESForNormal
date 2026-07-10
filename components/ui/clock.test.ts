import { describe, it, expect } from "vitest";
import { formatClock } from "@/components/ui/clock";

describe("formatClock", () => {
  it("HH:MM:SS로 0 패딩한다", () => {
    expect(formatClock(new Date(2026, 6, 9, 9, 5, 3))).toBe("09:05:03");
  });
  it("오후 시간을 24시간제로 표기한다", () => {
    expect(formatClock(new Date(2026, 6, 9, 14, 32, 7))).toBe("14:32:07");
  });
});
