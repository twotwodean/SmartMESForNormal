import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listPurchaseOrders, receiveGoods } from "@/lib/services/procurement-service";
import { listStock } from "@/lib/services/inventory-service";

afterAll(() => {
  execSync("npm run db:seed", { stdio: "ignore" });
});

describe("procurement-service", () => {
  it("발주 목록에 입고 진척률이 계산된다(seed PO-2607-002 = 300/200 → 67, PARTIAL)", async () => {
    const rows = await listPurchaseOrders();
    const po = rows.find((r) => r.code === "PO-2607-002")!;
    expect(po.received).toBe(200);
    expect(po.progress).toBe(67);
    expect(po.status).toBe("PARTIAL");
  });
  it("입고 처리 시 재고가 늘고 PO 상태가 갱신된다", async () => {
    const po = await prisma.purchaseOrder.findFirstOrThrow({ where: { code: "PO-2607-002" } });
    const before = (await listStock()).find((s) => s.itemId === po.itemId)!.qty;
    const { purchaseOrder } = await receiveGoods({ purchaseOrderId: po.id, qty: 100 }); // 200+100=300 → RECEIVED
    expect(purchaseOrder.status).toBe("RECEIVED");
    const after = (await listStock()).find((s) => s.itemId === po.itemId)!.qty;
    expect(after).toBe(before + 100);
  });
});
