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
});
