import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listSalesOrders, shipShipment } from "@/lib/services/sales-service";
import { listStock } from "@/lib/services/inventory-service";

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
});
