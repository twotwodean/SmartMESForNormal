import { describe, it, expect } from "vitest";
import { maintenanceSummary, listEquipment } from "@/lib/services/equipment-service";

describe("equipment-service", () => {
  it("MTTR가 완료 수리에서 계산된다(seed: 09:30~11:00 = 90분)", async () => {
    const s = await maintenanceSummary();
    expect(s.mttrMin).toBe(90);      // seed 완료 수리 1건: 90분
    expect(s.repairCount).toBe(1);   // 완료 1
    expect(s.openCount).toBe(1);     // 진행중 1
  });
  it("EQ-CNC-03은 미완료 수리가 있어 REPAIR 상태", async () => {
    const eqs = await listEquipment();
    const cnc = eqs.find((e) => e.code === "EQ-CNC-03");
    expect(cnc?.status).toBe("REPAIR");
  });
});
