import { describe, it, expect } from "vitest";
import { netRequirement, grossDemand } from "@/lib/domain/mrp";
import type { BomLink } from "@/lib/domain/bom";

describe("netRequirement", () => {
  it("순소요 = 총소요 + 안전재고 - 현재고 - 입고예정", () => {
    expect(netRequirement(100, 30, 20, 10)).toBe(80); // 100+20-30-10
  });
  it("공급이 충분하면 0으로 캡", () => {
    expect(netRequirement(50, 60, 0, 20)).toBe(0);
  });
});

describe("grossDemand", () => {
  const bom: BomLink[] = [
    { parentId: "FIN", childId: "SUB", qtyPer: 2 },
    { parentId: "SUB", childId: "RAW", qtyPer: 3 },
  ];
  it("완제품 수요를 BOM 다단 전개해 품목별 총소요 집계(완제품 자체 포함)", () => {
    const g = grossDemand([{ itemId: "FIN", qty: 10 }], bom);
    expect(g.get("FIN")).toBe(10);
    expect(g.get("SUB")).toBe(20); // 10*2
    expect(g.get("RAW")).toBe(60); // 20*3
  });
  it("동일 품목 다중 수요는 합산", () => {
    const g = grossDemand([{ itemId: "FIN", qty: 5 }, { itemId: "SUB", qty: 4 }], bom);
    expect(g.get("SUB")).toBe(14); // 5*2 + 4
  });
});
