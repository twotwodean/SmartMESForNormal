import { describe, it, expect } from "vitest";
import { explodeBom } from "@/lib/domain/bom";

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
