# R2-D 재고수불·대시보드 실지표·감사로그·CSV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** R2 마무리 — 재고 수불 등록(MAT-1), 대시보드 실지표(PPM·MTTR·알람; DSH-2~3), 감사로그(SEC-3), CSV 내보내기(DSH-4).

**Architecture:** inventory-service에 `createTxn` 추가(append-only, 부호 포함). alarm-service·audit-service 신설. dashboard-service를 확장해 품질 PPM·설비 MTTR·알람을 포함 → 관리/경영 대시보드의 R2 자리표시자를 실데이터로 교체. 감사로그는 주요 변경(실적·검사·정비·수불)에 기록. CSV는 순수 유틸 + 클라이언트 다운로드. 변경 API는 OPERATOR+.

**Tech Stack:** 기존 스택.

---

## File Structure
| 파일 | 책임 |
|---|---|
| `lib/domain/csv.ts` (+test) | `toCsv(rows, columns)` 순수 유틸 |
| `lib/services/audit-service.ts` | `audit(action,entity,entityId?)`·`listAuditLogs()` |
| `lib/services/alarm-service.ts` | `listAlarms()` |
| `lib/services/inventory-service.ts` | (수정) `createTxn` 추가 |
| `lib/services/dashboard-service.ts` | (수정) quality·equipment·alarms 포함 |
| `app/api/inventory/txns/route.ts` | GET(itemId) / POST 수불등록(OPERATOR+) |
| `app/api/audit/route.ts` | GET 감사로그(requireUser) |
| `app/mockups/inventory/*` | (수정) 수불 등록 Dialog + CSV 버튼 |
| `app/mockups/manager/*`, `app/mockups/exec/*` | (수정) 실 PPM/MTTR/알람 |
| `app/mockups/audit/page.tsx` | 감사로그 화면 |
| `app/mockups/layout.tsx` | (수정) 네비 감사로그 |

FR-MAT-1, PRD-7(OEE 대체 지표), DSH-2~4, SEC-3.

---

### Task 1: CSV 유틸 + audit/alarm/inventory-txn 서비스 + API

- [ ] **Step 1: 실패 테스트 `lib/domain/csv.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/domain/csv";

describe("toCsv", () => {
  it("헤더+행을 CSV로 만든다", () => {
    const csv = toCsv([{ a: "x", b: 1 }, { a: "y", b: 2 }], [{ key: "a", label: "A" }, { key: "b", label: "B" }]);
    expect(csv).toBe("A,B\r\nx,1\r\ny,2");
  });
  it("쉼표·따옴표·개행은 큰따옴표로 감싸고 이스케이프한다", () => {
    const csv = toCsv([{ a: 'he said "hi", ok' }], [{ key: "a", label: "A" }]);
    expect(csv).toBe('A\r\n"he said ""hi"", ok"');
  });
});
```
Run → FAIL. `lib/domain/csv.ts`:
```ts
export interface CsvColumn<T> {
  key: keyof T;
  label: string;
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 객체 배열 → CSV 문자열(CRLF 구분) */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(",")).join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}
```
Run → PASS (2).

- [ ] **Step 2: `lib/services/audit-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

/** 주요 변경 감사 기록(현재 세션 사용자). 실패해도 본 트랜잭션을 막지 않도록 호출부에서 await하되 예외는 무시 가능. */
export async function audit(action: string, entity: string, entityId?: string): Promise<void> {
  const user = await getCurrentUser();
  await prisma.auditLog.create({ data: { userId: user?.userId ?? null, action, entity, entityId: entityId ?? null } });
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userName: string | null;
  createdAt: string;
}
export async function listAuditLogs(limit = 100): Promise<AuditRow[]> {
  const rows = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entityId, userName: r.user?.name ?? null, createdAt: r.createdAt.toISOString() }));
}
```

- [ ] **Step 3: `lib/services/alarm-service.ts`**
```ts
import { prisma } from "@/lib/db";
import type { AlarmTone } from "@/lib/domain/types";

export interface AlarmRow {
  id: string;
  tone: AlarmTone;
  title: string;
  message: string | null;
  createdAt: string;
}
export async function listAlarms(limit = 20): Promise<AlarmRow[]> {
  const rows = await prisma.alarm.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({ id: r.id, tone: r.tone as AlarmTone, title: r.title, message: r.message, createdAt: r.createdAt.toISOString() }));
}
```

- [ ] **Step 4: `lib/services/inventory-service.ts`에 `createTxn` 추가**
```ts
import type { InventoryTxnType } from "@/lib/domain/types";
// ...기존 코드 유지...

export interface CreateTxnInput {
  itemId: string;
  type: InventoryTxnType; // IN|OUT|MOVE|ADJUST|PRODUCE|CONSUME
  qty: number;            // 부호 포함(입고/생산 +, 출고/소비 -). ADJUST는 그대로.
  ref?: string;
}
export async function createTxn(input: CreateTxnInput) {
  return prisma.inventoryTxn.create({ data: { itemId: input.itemId, type: input.type, qty: input.qty, ref: input.ref } });
}
```

- [ ] **Step 5: 테스트 `lib/services/inventory-service.test.ts`에 createTxn 케이스 추가**(afterAll 재seed)
```ts
import { afterAll } from "vitest";
import { execSync } from "node:child_process";
import { createTxn } from "@/lib/services/inventory-service";
// 기존 import/테스트 유지, 아래 추가

afterAll(() => execSync("npm run db:seed", { stdio: "ignore" }));

// describe 블록 내에 추가:
it("수불 등록 시 현재고가 변한다", async () => {
  const rows = await listStock();
  const gb = rows.find((r) => r.code === "FG-GB2500")!;
  await createTxn({ itemId: gb.itemId, type: "OUT", qty: -20, ref: "TEST" });
  const after = (await listStock()).find((r) => r.code === "FG-GB2500")!;
  expect(after.qty).toBe(gb.qty - 20);
});
```
(기존 파일에 `createTxn`, `listStock` import 및 afterAll 추가.)

- [ ] **Step 6: API — `app/api/inventory/txns/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listTxns, createTxn } from "@/lib/services/inventory-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId가 필요합니다." }, { status: 400 });
  return NextResponse.json(await listTxns(itemId));
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.itemId || !body?.type || typeof body.qty !== "number") {
    return NextResponse.json({ error: "itemId·type·qty가 필요합니다." }, { status: 400 });
  }
  const txn = await createTxn({ itemId: body.itemId, type: body.type, qty: body.qty, ref: body.ref });
  await audit("INVENTORY_TXN", "InventoryTxn", txn.id);
  return NextResponse.json(txn, { status: 201 });
}
```

- [ ] **Step 7: API — `app/api/audit/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { listAuditLogs } from "@/lib/services/audit-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listAuditLogs());
}
```

- [ ] **Step 8: 확인 + Commit**
`npm run db:seed` → `npm test -- lib/domain/csv.test.ts lib/services/inventory-service.test.ts`(통과) → `npx tsc --noEmit` → `npm run build`.
```bash
git add lib/domain/csv.ts lib/domain/csv.test.ts lib/services/audit-service.ts lib/services/alarm-service.ts lib/services/inventory-service.ts lib/services/inventory-service.test.ts app/api/inventory/txns app/api/audit
git commit -m "feat(r2): CSV 유틸 + 감사/알람/수불 서비스 + 수불·감사 API"
```

---

### Task 2: 대시보드 실지표(PPM·MTTR·알람) 연동

- [ ] **Step 1: `lib/services/dashboard-service.ts` 확장** — getDashboard 반환에 추가:
  - `quality: { overallPpm: number }` (from `qualitySummary()`)
  - `equipment: { mttrMin: number; openMaintenance: number }` (from `maintenanceSummary()`)
  - `alarms: AlarmRow[]` (from `listAlarms()`)
기존 `workOrders`, `stockWarnings` 유지. 관련 서비스 import.

- [ ] **Step 2: 관리 대시보드(manager-client) 수정** — R2 자리표시자였던 KPI/알람을 실데이터로:
  - "불량 PPM" KPITile value = dashboard.quality.overallPpm.toLocaleString(), tone by threshold.
  - "설비 MTTR" 또는 "정비중" KPITile = dashboard.equipment.mttrMin+"분" / openMaintenance.
  - 알람 카드 = dashboard.alarms 실목록(tone dot + title + message). 정적 ALARMS import 제거.
  - 라인 OEE 게이지(GaugeTile LINES 정적)는 R3까지 자리표시자 유지 가능 — 주석 유지(라인별 OEE는 라인 실적 집계 필요, R3+). 단 static KPIS 중 PPM은 실데이터로 교체.

- [ ] **Step 2b: 경영 대시보드(exec) 수정** — 알람 요약을 dashboard.alarms 실데이터로, PPM tile 실데이터로.

- [ ] **Step 3: 검증 + Commit**
`npx tsc --noEmit`, `npm run build`.
```bash
git add lib/services/dashboard-service.ts app/mockups/manager app/mockups/exec
git commit -m "feat(r2): 대시보드 실지표(PPM·MTTR·알람) 연동"
```

---

### Task 3: 재고 수불 등록 UI + CSV + 감사로그 화면

- [ ] **Step 1: inventory 화면에 수불 등록 Dialog + CSV** — `inventory-client.tsx` 수정:
  - SectionHeader actions에 "CSV 내보내기" Button + "수불 등록" Button 추가.
  - CSV: `toCsv(rows, [{key:"code",label:"품목코드"},{key:"name",label:"품목명"},{key:"qty",label:"현재고"},{key:"safety",label:"안전재고"},{key:"uom",label:"단위"},{key:"status",label:"상태"}])` → Blob 다운로드(`inventory.csv`). 클라이언트 헬퍼 `downloadCsv(filename, csv)`(a[download] + URL.createObjectURL).
  - 수불 등록 Dialog: 품목 Select(rows)·유형 Select(IN 입고/OUT 출고/ADJUST 조정)·수량 NumberStepper(부호는 유형에 따라: OUT은 음수로 전송) → POST /api/inventory/txns → ok Toast+router.refresh; 403. ToastProvider로 client 감싸기(현재 InventoryClient가 ToastProvider 없으면 추가).
- [ ] **Step 2: 작업지시 CSV** — work-orders-client.tsx SectionHeader에 "CSV 내보내기" 추가(code/itemName/qty/status/center).
- [ ] **Step 3: 감사로그 화면 `app/mockups/audit/page.tsx`(server, force-dynamic) + client** — listAuditLogs() 로드 → DataTable(일시·사용자·액션·엔티티·대상ID). 네비 "기준정보" 또는 별도 "시스템" 그룹에 "감사로그"(/mockups/audit) 추가 + CRUMB. (ADMIN 전용은 아니고 requireUser; 표시만.)
- [ ] **Step 4: 검증 + Commit**
`npx tsc --noEmit`, `npm run build`.
```bash
git add app/mockups/inventory app/mockups/work-orders app/mockups/audit app/mockups/layout.tsx lib/... (필요 시 downloadCsv 위치)
git commit -m "feat(r2): 재고 수불 등록 + CSV 내보내기 + 감사로그 화면"
```

---

### Task 4: 전체 검증 + 실렌더
- [ ] **Step 1** `npm run db:seed` → `npm test`(csv 2 포함 전체 통과, 카운트) → `npx tsc --noEmit` → `npm run build`.
- [ ] **Step 2 실렌더(Playwright)** `npm run dev`(3001). admin:
  - `/mockups/manager`: 불량 PPM 실값(86,957), 알람 카드 실 3건 표시.
  - `/mockups/inventory`: "수불 등록" → 유형 출고·품목·수량 → 등록 → Toast, 현재고 감소 반영. "CSV 내보내기" 클릭 시 다운로드 트리거(응답 파일명 inventory.csv) 확인.
  - `/mockups/audit`: 방금 수불이 감사로그에 INVENTORY_TXN으로 표시.
  - viewer: 수불 등록 403.
  Report ACTUAL. 종료 후 `npm run db:seed`, `npx kill-port 3001`, 스크래치 삭제.
- [ ] **Step 3** 이슈 수정 시 별도 커밋. → **R2 완료.**

---

## Self-Review 결과
**Spec 커버리지:** FR-MAT-1(수불 등록·현황) → createTxn+API+UI ✅ / DSH-2~3(품질·설비·알람 카드) → dashboard 실지표 ✅ / DSH-4(CSV) → toCsv+다운로드 ✅ / SEC-3(감사로그) → audit-service+화면 ✅ / PRD-7(OEE) → 부분(MTTR 지표; 라인별 OEE는 R3 자리표시자 유지, 명시). RBAC(수불 OPERATOR+) ✅.
**플레이스홀더 스캔:** 라인별 OEE 게이지는 의도적 R3 이월(주석). 그 외 실데이터.
**타입 일관성:** InventoryTxnType·AlarmTone(domain) 재사용. toCsv 제네릭. dashboard-service 반환 확장 타입 명시. audit는 세션 사용자 기록.
**주의:** inventory-service.test.ts는 쓰기 테스트라 afterAll 재seed. 대시보드는 이미 force-dynamic. CSV 다운로드는 클라이언트(Blob). audit 실패가 본 로직을 막지 않도록 API에서 txn 생성 후 audit(예외 시에도 201 유지하려면 try/catch로 감싸도 됨 — 구현 시 판단).
**범위:** R2-D로 R2 완료. 이후 R3(자재구매·영업·특채·모델/도면).
