import { describe, it, expect } from "vitest";
import { lotTree } from "@/lib/services/lot-service";

describe("lot-service.lotTree", () => {
  it("seed된 Lot 계보를 조상/후손으로 반환한다", async () => {
    // seed: LOT-2600701(원자재) → LOT-2600712(반제품)
    const tree = await lotTree("LOT-2600712");
    expect(tree).toBeDefined();
    expect(tree!.code).toBe("LOT-2600712");
    expect(tree!.ancestors.map((a) => a.code)).toContain("LOT-2600701");
  });
});
