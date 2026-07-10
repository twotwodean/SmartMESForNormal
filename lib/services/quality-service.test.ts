import { describe, it, expect } from "vitest";
import { qualitySummary, listInspections } from "@/lib/services/quality-service";

describe("quality-service", () => {
  it("검사 목록에 PPM이 계산된다", async () => {
    const rows = await listInspections();
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const first = rows[0];
    expect(first.ppm).toBe(Math.round((first.defectQty / first.qty) * 1_000_000));
  });
  it("PPM 요약 총계가 seed와 일치한다", async () => {
    const s = await qualitySummary();
    // seed: qty 100+80+50=230, defect 3+5+12=20
    expect(s.totalQty).toBe(230);
    expect(s.totalDefect).toBe(20);
    expect(s.overallPpm).toBe(86957);
  });
});
