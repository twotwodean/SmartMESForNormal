import { describe, it, expect } from "vitest";
import { receiptProgress, poStatusFor } from "@/lib/domain/procurement";

describe("receiptProgress", () => {
  it("입고/발주 비율(%)", () => {
    expect(receiptProgress(100, 0)).toBe(0);
    expect(receiptProgress(100, 40)).toBe(40);
    expect(receiptProgress(100, 100)).toBe(100);
  });
  it("발주 0이면 0", () => {
    expect(receiptProgress(0, 0)).toBe(0);
  });
  it("초과 입고는 100으로 캡", () => {
    expect(receiptProgress(100, 130)).toBe(100);
  });
});

describe("poStatusFor", () => {
  it("입고량에 따라 상태", () => {
    expect(poStatusFor(100, 0)).toBe("ORDERED");
    expect(poStatusFor(100, 40)).toBe("PARTIAL");
    expect(poStatusFor(100, 100)).toBe("RECEIVED");
    expect(poStatusFor(100, 120)).toBe("RECEIVED");
  });
});
