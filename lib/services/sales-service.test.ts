import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listSalesOrders, shipShipment, returnShipment } from "@/lib/services/sales-service";
import { listStock, listTxns } from "@/lib/services/inventory-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("sales-service", () => {
  it("수주 목록에 고객·품목이 포함된다(seed SO-2607-001)", async () => {
    const rows = await listSalesOrders();
    const so = rows.find((r) => r.code === "SO-2607-001")!;
    expect(so.customerName).toBe("한빛기계");
    expect(so.qty).toBe(200);
  });
  it("출하등록 시 상태 SHIPPED + 완제품 재고 감소", async () => {
    const sh = await prisma.shipment.findFirstOrThrow({ where: { code: "SH-2607-001" } });
    const before = (await listStock()).find((s) => s.itemId === sh.itemId)!.qty;
    const updated = await shipShipment(sh.id);
    expect(updated.status).toBe("SHIPPED");
    const after = (await listStock()).find((s) => s.itemId === sh.itemId)!.qty;
    expect(after).toBe(before - sh.qty); // 120 출하
  });
  it("동일 출하건 재출하 시도는 에러 + InventoryTxn OUT은 1건만 존재(이중 처리 방지 게이트)", async () => {
    const sh = await prisma.shipment.findFirstOrThrow({ where: { code: "SH-2607-001" } });
    // 위 테스트에서 이미 SHIPPED로 전이됨. 재호출은 원자적 게이트에 의해 거부되어야 한다.
    await expect(shipShipment(sh.id)).rejects.toThrow("이미 처리된 출하입니다.");
    const txns = await listTxns(sh.itemId);
    const outTxns = txns.filter((t) => t.type === "OUT" && t.ref === sh.code);
    expect(outTxns.length).toBe(1); // 두 번 호출해도 OUT 트랜잭션은 단 1건
  });
  it("반품 처리 후 재반품 시도는 에러 + InventoryTxn IN(RET)은 1건만 존재", async () => {
    const sh = await prisma.shipment.findFirstOrThrow({ where: { code: "SH-2607-001" } });
    const returned = await returnShipment(sh.id);
    expect(returned.status).toBe("RETURNED");
    await expect(returnShipment(sh.id)).rejects.toThrow("출하 완료건만 반품 가능합니다.");
    const txns = await listTxns(sh.itemId);
    const retTxns = txns.filter((t) => t.type === "IN" && t.ref === `${sh.code}-RET`);
    expect(retTxns.length).toBe(1); // 두 번 호출해도 반품 IN 트랜잭션은 단 1건
  });
});
