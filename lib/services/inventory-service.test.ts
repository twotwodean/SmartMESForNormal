import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { listStock, createTxn } from "@/lib/services/inventory-service";

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
