import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listProductModels, createProductModel, listDocuments, createDocument } from "@/lib/services/catalog-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("catalog-service", () => {
  it("모델 목록 조회 + 등록", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const before = (await listProductModels()).length;
    await createProductModel({ itemId: item.id, code: `PM-TEST-${Date.now().toString().slice(-5)}`, name: "테스트 모델" });
    expect((await listProductModels()).length).toBe(before + 1);
  });
  it("문서 목록 조회 + 등록(기본 rev A)", async () => {
    const before = (await listDocuments()).length;
    const doc = await createDocument({ name: "테스트 도면" });
    expect(doc.rev).toBe("A");
    expect((await listDocuments()).length).toBe(before + 1);
  });
});
