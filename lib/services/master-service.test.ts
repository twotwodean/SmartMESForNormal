import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import {
  listItems, createItem, updateItem, deleteItem,
  createWorkCenter, deleteWorkCenter, createProcessStage, deleteProcessStage,
  listBom, addBomComponent, updateBomQty, removeBomComponent,
  listRoutings, createRouting, deleteRouting, addRoutingStep, removeRoutingStep,
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
