import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listStock, createTxn, listTxnsPaged } from "@/lib/services/inventory-service";

const TAG = `PGNTEST_${Date.now().toString().slice(-8)}`;
const TOTAL = 25;

afterAll(() => {
  execSync("npm run db:seed", { stdio: "ignore" });
});

describe("inventory-service.listStock", () => {
  it("품목별 파생 현재고와 상태를 반환한다", async () => {
    const rows = await listStock();
    const sus = rows.find((r) => r.code === "RM-SUS304");
    expect(sus).toBeDefined();
    expect(sus!.qty).toBe(180); // 1200 IN - 1020 CONSUME (seed)
    expect(sus!.status).toBe("BELOW"); // safety 250
    const gb = rows.find((r) => r.code === "FG-GB2500");
    expect(gb!.status).toBe("NORMAL");
  });

  it("수불 등록 시 현재고가 변한다", async () => {
    const rows = await listStock();
    const gb = rows.find((r) => r.code === "FG-GB2500")!;
    await createTxn({ itemId: gb.itemId, type: "OUT", qty: -20, ref: "TEST" });
    const after = (await listStock()).find((r) => r.code === "FG-GB2500")!;
    expect(after.qty).toBe(gb.qty - 20);
  });
});

describe("inventory-service.listTxnsPaged 페이지네이션", () => {
  let itemId: string;

  beforeAll(async () => {
    const item = await prisma.item.create({
      data: { code: `ITEM_${TAG}`, name: `테스트품목_${TAG}`, type: "RAW", uom: "EA", safetyStock: 0 },
    });
    itemId = item.id;
    for (let i = 0; i < TOTAL; i++) {
      await prisma.inventoryTxn.create({
        data: { itemId, type: "IN", qty: 1, ref: i === 0 ? `SPECIAL_${TAG}` : `REF_${TAG}_${i}` },
      });
    }
  });

  it("total이 생성한 수불 건수와 일치한다(itemId 필터)", async () => {
    const result = await listTxnsPaged({ itemId, page: 1, pageSize: TOTAL, search: "" });
    expect(result.total).toBe(TOTAL);
    expect(result.rows.length).toBe(TOTAL);
    expect(result.pageCount).toBe(1);
  });

  it("page 2는 page 1과 겹치지 않는 슬라이스를 반환한다", async () => {
    const page1 = await listTxnsPaged({ itemId, page: 1, pageSize: 10, search: "" });
    const page2 = await listTxnsPaged({ itemId, page: 2, pageSize: 10, search: "" });
    expect(page1.rows.length).toBe(10);
    expect(page2.rows.length).toBe(10);
    const ids1 = new Set(page1.rows.map((r) => r.id));
    const ids2 = new Set(page2.rows.map((r) => r.id));
    for (const id of ids2) expect(ids1.has(id)).toBe(false);
    expect(page1.total).toBe(TOTAL);
    expect(page1.pageCount).toBe(3);
  });

  it("search로 ref 기준 필터링된다(1건)", async () => {
    const result = await listTxnsPaged({ itemId, page: 1, pageSize: TOTAL, search: `SPECIAL_${TAG}` });
    expect(result.total).toBe(1);
    expect(result.rows[0]?.ref).toBe(`SPECIAL_${TAG}`);
  });

  it("다른 품목의 수불은 포함되지 않는다", async () => {
    const result = await listTxnsPaged({ itemId, page: 1, pageSize: 100, search: "" });
    expect(result.rows.every((r) => r.itemId === itemId)).toBe(true);
  });
});
