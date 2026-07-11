import { describe, it, expect } from "vitest";
import { computeMrp } from "@/lib/services/mrp-service";
import { netRequirement } from "@/lib/domain/mrp";

describe("mrp-service", () => {
  it("모든 품목에 대해 행을 반환하고 순소요 공식이 일관된다", async () => {
    const rows = await computeMrp();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.net).toBe(netRequirement(r.gross, r.onHand, r.safety, r.incoming));
      expect(r.net).toBeGreaterThanOrEqual(0);
    }
  });
  it("순소요가 있으면 제안이 PURCHASE 또는 PRODUCE, 없으면 NONE", async () => {
    const rows = await computeMrp();
    for (const r of rows) {
      if (r.net > 0) expect(["PURCHASE", "PRODUCE"]).toContain(r.suggestion);
      else expect(r.suggestion).toBe("NONE");
    }
  });
});
