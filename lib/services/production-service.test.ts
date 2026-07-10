import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { registerResult } from "@/lib/services/production-service";
import { listStock } from "@/lib/services/inventory-service";

// 이 테스트는 seed된 dev.db를 변경한다. 종료 후 재seed로 원복.
afterAll(() => {
  execSync("npm run db:seed", { stdio: "ignore" });
});

describe("production-service.registerResult", () => {
  it("실적 등록 시 완제품 재고가 양품만큼 증가하고 WO가 RUNNING이 된다", async () => {
    const wo = await prisma.workOrder.findFirstOrThrow({ where: { code: "WO-260709-011" } });
    const before = (await listStock()).find((s) => s.itemId === wo.itemId)!.qty;

    const { workOrder } = await registerResult({ workOrderId: wo.id, goodQty: 50, defectQty: 2 });
    expect(workOrder.status).toBe("RUNNING");

    const after = (await listStock()).find((s) => s.itemId === wo.itemId)!.qty;
    expect(after).toBe(before + 50);
  });
});
