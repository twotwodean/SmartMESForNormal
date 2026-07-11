import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { evaluateAndTrigger, checkDuePreventive } from "@/lib/services/predictive-service";

// 이 테스트는 seed된 dev DB를 변경한다. 종료 후 재seed로 원복.
afterAll(() => {
  execSync("npm run db:seed", { stdio: "ignore" });
});

describe("predictive-service.evaluateAndTrigger", () => {
  it("임계 위반 시 PREDICTIVE 정비지시를 생성하고, 반복 호출은 중복생성하지 않는다(dedupe)", async () => {
    const before = await prisma.maintenanceOrder.count({ where: { type: "PREDICTIVE" } });

    const first = await evaluateAndTrigger("EQ-CNC-03", { temperature: 60 });
    expect(first.created).toContain("temperature");

    const afterFirst = await prisma.maintenanceOrder.count({ where: { type: "PREDICTIVE" } });
    expect(afterFirst).toBe(before + 1);

    const alarmCount = await prisma.alarm.count({ where: { title: { contains: "예지보전 경보" } } });
    expect(alarmCount).toBeGreaterThanOrEqual(1);

    // 두번째 호출: 같은 신호로 이미 open PREDICTIVE 지시가 있으므로 재생성되지 않아야 한다.
    const second = await evaluateAndTrigger("EQ-CNC-03", { temperature: 61 });
    expect(second.created).toHaveLength(0);

    const afterSecond = await prisma.maintenanceOrder.count({ where: { type: "PREDICTIVE" } });
    expect(afterSecond).toBe(afterFirst);
  });
});

describe("predictive-service.checkDuePreventive", () => {
  it("만기 도래한 스케줄에서 PREVENTIVE 지시를 생성하고 nextDate를 전진시킨다", async () => {
    const cnc = await prisma.equipment.findUniqueOrThrow({ where: { code: "EQ-CNC-03" } });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const schedule = await prisma.maintenanceSchedule.create({
      data: { equipmentId: cnc.id, intervalDays: 30, nextDate: yesterday },
    });

    const before = await prisma.maintenanceOrder.count({ where: { type: "PREVENTIVE" } });
    const result = await checkDuePreventive(new Date());
    expect(result.created).toBeGreaterThanOrEqual(1);

    const after = await prisma.maintenanceOrder.count({ where: { type: "PREVENTIVE" } });
    expect(after).toBeGreaterThan(before);

    const updated = await prisma.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
    expect(updated.nextDate.getTime()).toBeGreaterThan(yesterday.getTime());
  });
});
