import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import {
  listItems, createItem, updateItem, deleteItem,
  createWorkCenter, deleteWorkCenter, createProcessStage, deleteProcessStage,
  listBom, addBomComponent, updateBomQty, removeBomComponent,
  listRoutings, createRouting, deleteRouting, addRoutingStep, removeRoutingStep,
  listOperators, createOperator, updateOperator, deleteOperator,
  listShifts, createShift, updateShift, deleteShift,
  listDowntimeReasons, createDowntimeReason, updateDowntimeReason, deleteDowntimeReason,
} from "@/lib/services/master-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("master-service Item", () => {
  it("생성/수정/삭제", async () => {
    const it0 = await createItem({ code: `MDM-${Date.now().toString().slice(-6)}`, name: "테스트품목", type: "RAW", uom: "EA", safetyStock: 5 });
    const up = await updateItem(it0.id, { name: "수정품목", safetyStock: 9 });
    expect(up.name).toBe("수정품목");
    await deleteItem(it0.id);
    expect((await listItems()).find((r) => r.id === it0.id)).toBeUndefined();
  });
  it("중복 코드는 에러", async () => {
    await expect(createItem({ code: "RM-SUS304", name: "중복", type: "RAW", uom: "kg", safetyStock: 0 })).rejects.toThrow("이미 존재");
  });
  it("참조되는 품목 삭제는 차단", async () => {
    const ref = await prisma.item.findFirstOrThrow({ where: { code: "RM-SUS304" } });
    await expect(deleteItem(ref.id)).rejects.toThrow("사용 중");
  });
});

describe("master-service WorkCenter/ProcessStage", () => {
  it("작업장 생성/삭제", async () => {
    const wc = await createWorkCenter({ code: `WC-${Date.now().toString().slice(-6)}`, name: "테스트작업장" });
    await deleteWorkCenter(wc.id);
  });
  it("공정 생성/삭제", async () => {
    const ps = await createProcessStage({ code: `PS-${Date.now().toString().slice(-6)}`, name: "테스트공정", seq: 99 });
    await deleteProcessStage(ps.id);
  });
});

describe("master-service BOM", () => {
  it("하위 품목 추가/조회", async () => {
    const semi = await prisma.item.findFirstOrThrow({ where: { code: "SF-SHAFT" } });
    const raw2 = await prisma.item.findFirstOrThrow({ where: { code: "RM-AL6061" } });
    const link = await addBomComponent({ parentId: semi.id, childId: raw2.id, qtyPer: 4 });
    const bom = await listBom(semi.id);
    expect(bom.find((r) => r.id === link.id)?.childCode).toBe("RM-AL6061");

    const updated = await updateBomQty(link.id, 7);
    expect(updated.qtyPer).toBe(7);

    await removeBomComponent(link.id);
    expect((await listBom(semi.id)).find((r) => r.id === link.id)).toBeUndefined();
  });
  it("중복 하위 품목 추가는 에러", async () => {
    const fin = await prisma.item.findFirstOrThrow({ where: { code: "FG-GB2500" } });
    const semi = await prisma.item.findFirstOrThrow({ where: { code: "SF-SHAFT" } });
    await expect(addBomComponent({ parentId: fin.id, childId: semi.id, qtyPer: 1 })).rejects.toThrow("이미 등록된 하위 품목입니다");
  });
  it("순환 BOM 추가는 차단", async () => {
    const raw1 = await prisma.item.findFirstOrThrow({ where: { code: "RM-SUS304" } });
    const fin = await prisma.item.findFirstOrThrow({ where: { code: "FG-GB2500" } });
    // seed: FG-GB2500 -> SF-SHAFT -> RM-SUS304, RM-SUS304를 FG-GB2500의 상위로 추가하면 순환
    await expect(addBomComponent({ parentId: raw1.id, childId: fin.id, qtyPer: 1 })).rejects.toThrow("순환");
  });
});

describe("master-service Routing", () => {
  it("라우팅 생성 + 공정 추가/조회/삭제", async () => {
    const raw2 = await prisma.item.findFirstOrThrow({ where: { code: "RM-AL6061" } });
    const psCut = await prisma.processStage.findFirstOrThrow({ where: { code: "PS-CUT" } });
    const wcCnc = await prisma.workCenter.findFirstOrThrow({ where: { code: "WC-CNC1" } });

    const routing = await createRouting({ itemId: raw2.id, name: "테스트라우팅" });
    const step = await addRoutingStep({ routingId: routing.id, processStageId: psCut.id, workCenterId: wcCnc.id, seq: 1, stdTimeMin: 5 });

    const routings = await listRoutings(raw2.id);
    const found = routings.find((r) => r.id === routing.id);
    expect(found?.steps.find((s) => s.id === step.id)?.processName).toBe("절단");

    await removeRoutingStep(step.id);
    const after = await listRoutings(raw2.id);
    expect(after.find((r) => r.id === routing.id)?.steps.length).toBe(0);

    await deleteRouting(routing.id);
    expect((await listRoutings(raw2.id)).find((r) => r.id === routing.id)).toBeUndefined();
  });
});

describe("master-service Operator/Shift/DowntimeReason", () => {
  it("작업자 생성/수정/삭제", async () => {
    const op = await createOperator({ code: `OP-${Date.now().toString().slice(-6)}`, name: "테스트작업자" });
    const up = await updateOperator(op.id, { name: "수정작업자", active: false });
    expect(up.name).toBe("수정작업자");
    expect(up.active).toBe(false);
    await deleteOperator(op.id);
    expect((await listOperators()).find((r) => r.id === op.id)).toBeUndefined();
  });
  it("작업자 중복 코드는 에러", async () => {
    await expect(createOperator({ code: "OP-001", name: "중복" })).rejects.toThrow("이미 존재");
  });

  it("근무조 생성/수정/삭제", async () => {
    const sh = await createShift({ code: `SH-${Date.now().toString().slice(-6)}`, name: "테스트근무조" });
    const up = await updateShift(sh.id, { name: "수정근무조" });
    expect(up.name).toBe("수정근무조");
    await deleteShift(sh.id);
    expect((await listShifts()).find((r) => r.id === sh.id)).toBeUndefined();
  });
  it("근무조 중복 코드는 에러", async () => {
    await expect(createShift({ code: "DAY", name: "중복" })).rejects.toThrow("이미 존재");
  });

  it("정지사유 생성/수정/삭제", async () => {
    const dr = await createDowntimeReason({ code: `DR-${Date.now().toString().slice(-6)}`, label: "테스트사유", category: "PLANNED" });
    const up = await updateDowntimeReason(dr.id, { label: "수정사유", category: "UNPLANNED" });
    expect(up.label).toBe("수정사유");
    expect(up.category).toBe("UNPLANNED");
    await deleteDowntimeReason(dr.id);
    expect((await listDowntimeReasons()).find((r) => r.id === dr.id)).toBeUndefined();
  });
  it("정지사유 중복 코드는 에러", async () => {
    await expect(createDowntimeReason({ code: "DR-1", label: "중복", category: "UNPLANNED" })).rejects.toThrow("이미 존재");
  });

  it("생산실적에서 참조되는 작업자·근무조·정지사유 삭제는 차단", async () => {
    const wo = await prisma.workOrder.findFirstOrThrow({ where: { code: "WO-260709-011" } });
    const operator = await prisma.operator.findFirstOrThrow({ where: { code: "OP-001" } });
    const shift = await prisma.shift.findFirstOrThrow({ where: { code: "DAY" } });
    const reason = await prisma.downtimeReason.findFirstOrThrow({ where: { code: "DR-5" } });

    await prisma.productionResult.create({
      data: {
        workOrderId: wo.id,
        goodQty: 1,
        operatorId: operator.id,
        shiftId: shift.id,
        downtimeReasonId: reason.id,
      },
    });

    await expect(deleteOperator(operator.id)).rejects.toThrow("사용 중");
    await expect(deleteShift(shift.id)).rejects.toThrow("사용 중");
    await expect(deleteDowntimeReason(reason.id)).rejects.toThrow("사용 중");
  });
});
