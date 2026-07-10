import { describe, it, expect } from "vitest";
import { deriveStock } from "@/lib/domain/stock";

describe("deriveStock", () => {
  it("품목별로 트랜잭션 수량을 합산한다", () => {
    const txns = [
      { itemId: "A", qty: 100 },
      { itemId: "A", qty: -30 },
      { itemId: "B", qty: 50 },
    ];
    const stock = deriveStock(txns);
    expect(stock.get("A")).toBe(70);
    expect(stock.get("B")).toBe(50);
  });
  it("트랜잭션이 없으면 빈 맵", () => {
    expect(deriveStock([]).size).toBe(0);
  });
  it("음수 재고도 그대로 반영한다", () => {
    expect(deriveStock([{ itemId: "X", qty: -12 }]).get("X")).toBe(-12);
  });
});
