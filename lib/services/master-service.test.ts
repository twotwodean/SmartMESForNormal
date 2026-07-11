import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import {
  listItems, createItem, updateItem, deleteItem,
  createWorkCenter, deleteWorkCenter, createProcessStage, deleteProcessStage,
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
