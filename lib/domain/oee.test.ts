import { describe, it, expect } from "vitest";
import { oee } from "@/lib/domain/oee";

describe("oee", () => {
  it("가용성×성능×품질을 계산한다", () => {
    const r = oee({ plannedMin: 480, downtimeMin: 80, idealCycleMin: 1, totalCount: 380, goodCount: 361 });
    expect(r.availability).toBeCloseTo(400 / 480, 4);
    expect(r.performance).toBeCloseTo(380 / 400, 4);
    expect(r.quality).toBeCloseTo(361 / 380, 4);
    expect(r.oee).toBeCloseTo((400 / 480) * (380 / 400) * (361 / 380), 4);
  });
  it("계획시간 0이면 모두 0", () => {
    const r = oee({ plannedMin: 0, downtimeMin: 0, idealCycleMin: 1, totalCount: 0, goodCount: 0 });
    expect(r.oee).toBe(0);
  });
});
