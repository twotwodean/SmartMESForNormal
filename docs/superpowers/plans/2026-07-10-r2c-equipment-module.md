# R2-C 설비보전 모듈(수리·예방점검·MTTR/MTBF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** FR-EQP-1~3 — 설비 현황, 수리의뢰·수리결과(MTTR/MTBF), 예방점검 스케줄을 서비스·API·화면으로 구현.

**Architecture:** `equipment-service`가 Prisma + 도메인 `mttr`/`mtbf` 조합. 설비 상태는 미완료 수리주문 유무로 파생(REPAIR/RUN). API 조회(requireUser)+변경(requireRole OPERATOR: 수리 의뢰·시작·완료). 설비 화면(/mockups/equipment)은 서버 컴포넌트→클라이언트가 MTTR/MTBF KPI·설비 목록·정비주문 목록(의뢰/시작/완료)·예방점검 렌더. 네비에 "설비정비" 추가.

**Tech Stack:** 기존 스택.

---

## File Structure
| 파일 | 책임 |
|---|---|
| `lib/services/equipment-service.ts` (+test) | 설비 목록·정비주문 목록/생성/상태·MTTR/MTBF 요약·예방점검 |
| `app/api/equipment/route.ts` | GET 설비 |
| `app/api/equipment/summary/route.ts` | GET MTTR/MTBF 요약 |
| `app/api/maintenance-orders/route.ts` | GET 목록 / POST 수리의뢰(OPERATOR+) |
| `app/api/maintenance-orders/[id]/route.ts` | PATCH 시작/완료(OPERATOR+) |
| `app/mockups/equipment/page.tsx`+client | 설비 화면 |
| `app/mockups/layout.tsx` | (수정) 네비 설비정비 |

---

### Task 1: equipment-service + 테스트

- [ ] **Step 1: `lib/services/equipment-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { mttr, mtbf } from "@/lib/domain/maintenance";
import type { MaintenanceType, MaintenanceStatus } from "@/lib/domain/types";

export type EquipmentStatus = "RUN" | "REPAIR";

export interface EquipmentRow {
  id: string;
  code: string;
  name: string;
  center: string;
  status: EquipmentStatus;
}

export async function listEquipment(): Promise<EquipmentRow[]> {
  const eqs = await prisma.equipment.findMany({
    include: { workCenter: true, maintenanceOrders: { where: { status: { in: ["REQUESTED", "IN_PROGRESS"] } } } },
    orderBy: { code: "asc" },
  });
  return eqs.map((e) => ({
    id: e.id, code: e.code, name: e.name, center: e.workCenter?.name ?? "—",
    status: e.maintenanceOrders.length > 0 ? "REPAIR" : "RUN",
  }));
}

export interface MaintenanceOrderRow {
  id: string;
  equipmentName: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  repairMin: number | null;
}

export async function listMaintenanceOrders(): Promise<MaintenanceOrderRow[]> {
  const rows = await prisma.maintenanceOrder.findMany({ include: { equipment: true }, orderBy: { requestedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, equipmentName: r.equipment.name, type: r.type as MaintenanceType, status: r.status as MaintenanceStatus,
    description: r.description, requestedAt: r.requestedAt.toISOString(),
    startedAt: r.startedAt?.toISOString() ?? null, finishedAt: r.finishedAt?.toISOString() ?? null,
    repairMin: r.startedAt && r.finishedAt ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 60000) : null,
  }));
}

export interface MaintenanceSummary {
  mttrMin: number;      // 평균 수리시간(분)
  mtbfMin: number;      // 평균 고장간격(분, 최근 30일 기준)
  repairCount: number;  // 완료 수리 건수
  openCount: number;    // 미완료(REQUESTED/IN_PROGRESS)
}

export async function maintenanceSummary(): Promise<MaintenanceSummary> {
  const all = await prisma.maintenanceOrder.findMany({ where: { type: "REPAIR" } });
  const spans = all.map((o) => ({
    startedAt: o.startedAt ? o.startedAt.getTime() : null,
    finishedAt: o.finishedAt ? o.finishedAt.getTime() : null,
  }));
  const finished = all.filter((o) => o.finishedAt);
  const open = all.filter((o) => o.status === "REQUESTED" || o.status === "IN_PROGRESS");
  // MTTR: 분 단위 span으로 계산
  const mttrSpans = spans.map((s) => ({
    startedAt: s.startedAt !== null ? Math.round(s.startedAt / 60000) : null,
    finishedAt: s.finishedAt !== null ? Math.round(s.finishedAt / 60000) : null,
  }));
  const periodMin = 30 * 24 * 60; // 최근 30일
  return {
    mttrMin: mttr(mttrSpans),
    mtbfMin: mtbf(finished.length, periodMin),
    repairCount: finished.length,
    openCount: open.length,
  };
}

export interface ScheduleRow {
  id: string;
  equipmentName: string;
  intervalDays: number;
  nextDate: string;
}
export async function listSchedules(): Promise<ScheduleRow[]> {
  const rows = await prisma.maintenanceSchedule.findMany({ include: { equipment: true }, orderBy: { nextDate: "asc" } });
  return rows.map((r) => ({ id: r.id, equipmentName: r.equipment.name, intervalDays: r.intervalDays, nextDate: r.nextDate.toISOString() }));
}

export async function createMaintenanceOrder(input: { equipmentId: string; type: MaintenanceType; description?: string }) {
  return prisma.maintenanceOrder.create({ data: { equipmentId: input.equipmentId, type: input.type, description: input.description, status: "REQUESTED" } });
}

export async function advanceMaintenance(id: string, action: "start" | "finish") {
  if (action === "start") return prisma.maintenanceOrder.update({ where: { id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
  return prisma.maintenanceOrder.update({ where: { id }, data: { status: "DONE", finishedAt: new Date() } });
}

export async function listEquipmentBrief() {
  return prisma.equipment.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } });
}
```

- [ ] **Step 2: 테스트 `lib/services/equipment-service.test.ts`** (seed 대상, 읽기)
```ts
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
```
Run → FAIL(모듈) → 구현 후 PASS. (seed 의존; 필요 시 `npm run db:seed` 먼저.)

- [ ] **Step 3: 확인 + Commit**
`npm test -- lib/services/equipment-service.test.ts` PASS, `npx tsc --noEmit` 클린.
```bash
git add lib/services/equipment-service.ts lib/services/equipment-service.test.ts
git commit -m "feat(r2): 설비 서비스(설비현황·정비주문·MTTR/MTBF·예방점검) + 테스트"
```

---

### Task 2: 설비 API

- [ ] **Step 1: `app/api/equipment/route.ts`** (GET listEquipment, requireUser, runtime nodejs) — guard 패턴 동일.
- [ ] **Step 2: `app/api/equipment/summary/route.ts`** (GET maintenanceSummary, requireUser).
- [ ] **Step 3: `app/api/maintenance-orders/route.ts`** (GET listMaintenanceOrders requireUser; POST createMaintenanceOrder requireRole OPERATOR, body {equipmentId, type, description?}, 400 검증, 201).
- [ ] **Step 4: `app/api/maintenance-orders/[id]/route.ts`** (PATCH requireRole OPERATOR, body {action:"start"|"finish"}, advanceMaintenance, 400 on bad action).
각 파일은 기존 guard 패턴(`const auth = await requireUser()/requireRole("OPERATOR"); if ("res" in auth) return auth.res;`), `export const runtime = "nodejs";`.
- [ ] **Step 5: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(4 라우트).
```bash
git add app/api/equipment app/api/maintenance-orders
git commit -m "feat(r2): 설비 API(설비·MTTR요약·정비주문 CRUD, RBAC)"
```

---

### Task 3: 설비 화면 + 네비

- [ ] **Step 1: `app/mockups/equipment/page.tsx`** (server, force-dynamic) — `maintenanceSummary()`·`listEquipment()`·`listMaintenanceOrders()`·`listSchedules()`·`listEquipmentBrief()` 병렬 로드 → `<EquipmentClient .../>`.
- [ ] **Step 2: `app/mockups/equipment/equipment-client.tsx`** (client, ToastProvider):
  - SectionHeader "설비 보전" + actions "수리 의뢰" Button(Dialog).
  - KPI 행: MTTR(분, mttrMin, unit "분", tone ok/warn by threshold >120 warn), MTBF(mtbfMin→일 환산 표시 or 분), 정비중(openCount, tone openCount>0?warn:ok), 완료 수리(repairCount).
  - 설비 목록 Card+간단 표/그리드: 설비 코드·이름·작업장·상태(StatusPill equipmentTone: RUN ok/REPAIR crit; label 가동/정비중).
  - 정비주문 Card+DataTable: 설비·유형(REPAIR 수리/PREVENTIVE 예방)·상태(StatusPill: REQUESTED warn/IN_PROGRESS primary/DONE ok)·수리시간(repairMin ?? "—")·요청일. 각 행에 상태별 액션 버튼: REQUESTED→"시작"(PATCH start), IN_PROGRESS→"완료"(PATCH finish) → 성공 시 Toast+router.refresh; 403 처리.
  - 예방점검 Card: 스케줄 목록(설비·주기(일)·다음점검일).
  - 수리 의뢰 Dialog: 설비 Select(brief)·유형 Select(REPAIR/PREVENTIVE)·설명 Input → POST /api/maintenance-orders → 성공 시 닫고 Toast+refresh; 403.
  D1 컴포넌트만·토큰만·no any. equipmentTone(D1-A) 재사용. 타입은 equipment-service에서 import.
- [ ] **Step 3: `app/mockups/layout.tsx` 네비** — "설비관리" 그룹이 없으면 추가: `{ label: "설비관리", items: [{ label: "설비정비", href: "/mockups/equipment", icon: Wrench }] }`. (Wrench는 app-shell 스토리에서 이미 쓰였으니 lucide import.) CRUMB에 `"/mockups/equipment": [{ label:"설비관리" }, { label:"설비정비" }]` 추가.
- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(/mockups/equipment dynamic).
```bash
git add app/mockups/equipment app/mockups/layout.tsx
git commit -m "feat(r2): 설비 화면(MTTR/MTBF KPI·설비현황·정비주문·예방점검) + 네비"
```

---

### Task 4: 전체 검증 + 실렌더
- [ ] **Step 1** `npm run db:seed` → `npm test`(설비 서비스 포함 통과, 카운트) → `npx tsc --noEmit` → `npm run build`.
- [ ] **Step 2 실렌더(Playwright)** `npm run dev`(3001). admin → `/mockups/equipment`:
  - MTTR 90분 KPI, 정비중 1 표시. 설비 목록에 EQ-CNC-03 = 정비중(REPAIR crit pill). 정비주문 2건(완료 1·진행중 1).
  - 진행중 주문 "완료" 클릭 → Toast, 상태 DONE로 갱신(정비중 0).
  - "수리 의뢰" → Dialog → 설비·유형 REPAIR·설명 입력 → 등록 → 목록 증가.
  - viewer → 수리 의뢰/시작·완료 시 403 "권한 없음".
  Report ACTUAL. 종료 후 `npm run db:seed` 원복, `npx kill-port 3001`, 스크래치 삭제.
- [ ] **Step 3** 이슈 수정 시 별도 커밋.

---

## Self-Review 결과
**Spec 커버리지:** FR-EQP-1(설비현황·가동) → listEquipment+상태파생 ✅ / FR-EQP-2(수리의뢰·결과·MTTR/MTBF) → 정비주문 CRUD+summary ✅ / FR-EQP-3(예방점검 스케줄) → listSchedules ✅. RBAC(변경 OPERATOR+) ✅.
**플레이스홀더 스캔:** 없음(Task 3은 상세 지침).
**타입 일관성:** MaintenanceType/Status(domain)·EquipmentRow/MaintenanceOrderRow/MaintenanceSummary(service) 재사용. mttr/mtbf domain 함수 재사용. equipmentTone(D1-A) 매핑.
**주의:** MTTR은 seed 완료 수리(09:30~11:00=90분)로 검증. 상태 파생(미완료 수리 유무). server(force-dynamic)+client(액션/의뢰 POST).
**범위:** R2-C(설비보전). 이후 R2-D(재고 수불 등록·OEE/알람 대시보드 연동·감사로그·CSV 내보내기)로 R2 마무리.
