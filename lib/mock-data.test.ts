import { describe, it, expect } from "vitest";
import { WORK_ORDERS, INVENTORY, workOrderTotals } from "@/lib/mock-data";

describe("mock-data", () => {
  it("작업지시가 존재하고 상태가 유효하다", () => {
    expect(WORK_ORDERS.length).toBeGreaterThan(0);
    for (const wo of WORK_ORDERS) {
      expect(["WAITING", "RUNNING", "DONE", "CANCELLED"]).toContain(wo.status);
      expect(wo.progress).toBeGreaterThanOrEqual(0);
      expect(wo.progress).toBeLessThanOrEqual(100);
    }
  });

  it("workOrderTotals가 상태별 개수를 집계한다", () => {
    const t = workOrderTotals(WORK_ORDERS);
    const sum = t.WAITING + t.RUNNING + t.DONE + t.CANCELLED;
    expect(sum).toBe(WORK_ORDERS.length);
  });

  it("재고 상태가 현재고/안전재고와 일치한다", () => {
    for (const it of INVENTORY) {
      const expected = it.qty < 0 ? "NEGATIVE" : it.qty < it.safety ? "BELOW" : "NORMAL";
      expect(it.status).toBe(expected);
    }
  });
});
