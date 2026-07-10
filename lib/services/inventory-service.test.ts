import { describe, it, expect } from "vitest";
import { listStock } from "@/lib/services/inventory-service";

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
});
