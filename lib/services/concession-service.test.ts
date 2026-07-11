import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listConcessions, createConcession, decideConcession } from "@/lib/services/concession-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("concession-service", () => {
  it("seed 특채 요청이 조회된다", async () => {
    const rows = await listConcessions();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.status === "REQUESTED")).toBe(true);
  });
  it("요청 생성 후 승인하면 APPROVED + decidedAt", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const c = await createConcession({ itemId: item.id, qty: 3, reason: "치수 경미 초과" });
    const decided = await decideConcession(c.id, true);
    expect(decided.status).toBe("APPROVED");
    expect(decided.decidedAt).not.toBeNull();
  });
  it("이미 처리된 요청 재결정은 에러", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const c = await createConcession({ itemId: item.id, qty: 1, reason: "x" });
    await decideConcession(c.id, false);
    await expect(decideConcession(c.id, true)).rejects.toThrow();
  });
  it("동일 요청 재결정 시도는 에러(이미 처리된...) + 최초 결정 상태가 유지된다(이중 처리 방지 게이트)", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const c = await createConcession({ itemId: item.id, qty: 2, reason: "게이트 검증" });
    const first = await decideConcession(c.id, true); // REQUESTED -> APPROVED
    expect(first.status).toBe("APPROVED");
    await expect(decideConcession(c.id, false)).rejects.toThrow("이미 처리된 요청입니다.");
    const after = await prisma.concession.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.status).toBe("APPROVED"); // 두 번째 호출(REJECTED 시도)이 반영되지 않음
    expect(after.decidedAt?.toISOString()).toBe(first.decidedAt?.toISOString()); // decidedAt도 최초 결정 그대로
  });
});
