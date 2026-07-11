import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { lotTree, listLotsPaged } from "@/lib/services/lot-service";

const TAG = `PGNTEST_${Date.now().toString().slice(-8)}`;
const TOTAL = 25;

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("lot-service.lotTree", () => {
  it("seed된 Lot 계보를 조상/후손으로 반환한다", async () => {
    // seed: LOT-2600701(원자재) → LOT-2600712(반제품)
    const tree = await lotTree("LOT-2600712");
    expect(tree).toBeDefined();
    expect(tree!.code).toBe("LOT-2600712");
    expect(tree!.ancestors.map((a) => a.code)).toContain("LOT-2600701");
  });
});

describe("lot-service.listLotsPaged 페이지네이션", () => {
  let itemId: string;

  beforeAll(async () => {
    const item = await prisma.item.create({
      data: { code: `ITEM_${TAG}`, name: `테스트품목_${TAG}`, type: "RAW", uom: "EA", safetyStock: 0 },
    });
    itemId = item.id;
    for (let i = 0; i < TOTAL; i++) {
      await prisma.lot.create({ data: { code: `LOT_${TAG}_${i}`, itemId, status: "CREATED" } });
    }
  });

  it("total이 생성한 Lot 건수와 일치한다", async () => {
    const result = await listLotsPaged({ page: 1, pageSize: TOTAL, search: TAG });
    expect(result.total).toBe(TOTAL);
    expect(result.rows.length).toBe(TOTAL);
    expect(result.pageCount).toBe(1);
  });

  it("page 2는 page 1과 겹치지 않는 슬라이스를 반환한다", async () => {
    const page1 = await listLotsPaged({ page: 1, pageSize: 10, search: TAG });
    const page2 = await listLotsPaged({ page: 2, pageSize: 10, search: TAG });
    expect(page1.rows.length).toBe(10);
    expect(page2.rows.length).toBe(10);
    const ids1 = new Set(page1.rows.map((r) => r.id));
    const ids2 = new Set(page2.rows.map((r) => r.id));
    for (const id of ids2) expect(ids1.has(id)).toBe(false);
    expect(page1.total).toBe(TOTAL);
    expect(page1.pageCount).toBe(3);
  });

  it("search로 품목명 기준 필터링된다", async () => {
    const result = await listLotsPaged({ page: 1, pageSize: TOTAL, search: `테스트품목_${TAG}` });
    expect(result.total).toBe(TOTAL);
  });

  it("search로 Lot 코드 기준 필터링된다(1건)", async () => {
    const result = await listLotsPaged({ page: 1, pageSize: TOTAL, search: `LOT_${TAG}_0` });
    expect(result.total).toBe(1);
    expect(result.rows[0]?.code).toBe(`LOT_${TAG}_0`);
  });
});
