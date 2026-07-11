import { describe, it, expect } from "vitest";
import { explodeBom, wouldCreateCycle } from "@/lib/domain/bom";

const bom = [
  { parentId: "P1", childId: "S1", qtyPer: 2 },
  { parentId: "P1", childId: "R2", qtyPer: 1 },
  { parentId: "S1", childId: "R1", qtyPer: 3 },
];

describe("explodeBom", () => {
  it("다단 소요량을 전개한다(수량 곱)", () => {
    const req = explodeBom("P1", 10, bom);
    expect(req.get("S1")).toBe(20);
    expect(req.get("R2")).toBe(10);
    expect(req.get("R1")).toBe(60);
  });
  it("BOM 없는 품목은 빈 맵", () => {
    expect(explodeBom("R1", 5, bom).size).toBe(0);
  });
});

describe("wouldCreateCycle", () => {
  it("자기참조는 순환", () => {
    expect(wouldCreateCycle("P1", "P1", bom)).toBe(true);
  });
  it("직접 순환(A→B 존재 시 B→A 추가)은 순환", () => {
    const links = [{ parentId: "A", childId: "B", qtyPer: 1 }];
    expect(wouldCreateCycle("B", "A", links)).toBe(true);
  });
  it("정상 추가는 순환 아님", () => {
    expect(wouldCreateCycle("P1", "R1", bom)).toBe(false);
  });
});
