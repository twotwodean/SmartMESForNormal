import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listAuditLogs } from "@/lib/services/audit-service";

const TAG = `PGNTEST_${Date.now().toString().slice(-8)}`;
const TOTAL = 25;
const SPECIAL_ACTION = `SPECIAL_${TAG}`;

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

beforeAll(async () => {
  // 25건의 테스트 감사 로그 생성(동일 entity 태그로 격리). 1건은 검색 전용 고유 action 부여.
  for (let i = 0; i < TOTAL; i++) {
    await prisma.auditLog.create({
      data: {
        action: i === 0 ? SPECIAL_ACTION : `ACT_${TAG}_${i}`,
        entity: TAG,
        entityId: null,
      },
    });
  }
});

describe("audit-service listAuditLogs 페이지네이션", () => {
  it("total이 생성한 건수와 일치한다", async () => {
    const result = await listAuditLogs({ page: 1, pageSize: TOTAL, search: TAG });
    expect(result.total).toBe(TOTAL);
    expect(result.rows.length).toBe(TOTAL);
    expect(result.pageCount).toBe(1);
  });

  it("page 2는 page 1과 겹치지 않는 슬라이스를 반환한다", async () => {
    const page1 = await listAuditLogs({ page: 1, pageSize: 10, search: TAG });
    const page2 = await listAuditLogs({ page: 2, pageSize: 10, search: TAG });
    expect(page1.rows.length).toBe(10);
    expect(page2.rows.length).toBe(10);
    const ids1 = new Set(page1.rows.map((r) => r.id));
    const ids2 = new Set(page2.rows.map((r) => r.id));
    for (const id of ids2) expect(ids1.has(id)).toBe(false);
    expect(page1.total).toBe(TOTAL);
    expect(page1.pageCount).toBe(3);
  });

  it("search로 특정 action만 필터링된다", async () => {
    const result = await listAuditLogs({ page: 1, pageSize: 20, search: SPECIAL_ACTION });
    expect(result.total).toBe(1);
    expect(result.rows[0]?.action).toBe(SPECIAL_ACTION);
  });
});
