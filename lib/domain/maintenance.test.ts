import { describe, it, expect } from "vitest";
import { mttr, mtbf } from "@/lib/domain/maintenance";

const orders = [
  { startedAt: 0, finishedAt: 60 },
  { startedAt: 100, finishedAt: 140 },
  { startedAt: 200, finishedAt: null },
];

describe("mttr/mtbf", () => {
  it("mttr는 완료 수리의 평균 수리시간(분)", () => {
    expect(mttr(orders)).toBe(50);
  });
  it("완료 수리가 없으면 mttr 0", () => {
    expect(mttr([{ startedAt: 0, finishedAt: null }])).toBe(0);
  });
  it("mtbf는 가동시간/고장횟수", () => {
    expect(mtbf(2, 1000)).toBe(500);
  });
  it("고장 0이면 mtbf는 전체 기간", () => {
    expect(mtbf(0, 1000)).toBe(1000);
  });
});
