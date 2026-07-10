import { describe, it, expect } from "vitest";
import { ancestors, descendants } from "@/lib/domain/genealogy";

const links = [
  { parentLotId: "R1", childLotId: "S1" },
  { parentLotId: "R2", childLotId: "S1" },
  { parentLotId: "S1", childLotId: "P1" },
];

describe("genealogy", () => {
  it("descendants는 후손을 모은다", () => {
    expect(descendants("R1", links).sort()).toEqual(["P1", "S1"]);
  });
  it("ancestors는 조상을 모은다", () => {
    expect(ancestors("P1", links).sort()).toEqual(["R1", "R2", "S1"]);
  });
  it("말단은 빈 배열", () => {
    expect(descendants("P1", links)).toEqual([]);
    expect(ancestors("R1", links)).toEqual([]);
  });
});
