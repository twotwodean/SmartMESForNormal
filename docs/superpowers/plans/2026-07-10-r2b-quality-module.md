# R2-B 품질 모듈(검사·부적합·PPM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** FR-QLT-1~3 — 검사(인수/공정/출하) 등록·현황, 부적합 현황, PPM 지표를 서비스·API·화면으로 구현.

**Architecture:** `quality-service`가 Prisma 조회 + 도메인 `ppm()` 조합. API는 조회(requireUser)+등록(requireRole OPERATOR). 품질 화면(/mockups/quality)은 서버 컴포넌트가 서비스로 데이터 로드→클라이언트가 PPM KPI·검사 DataTable·부적합 목록·검사 등록 Dialog(POST) 렌더. 목업 셸 네비에 "품질검사" 추가.

**Tech Stack:** 기존 스택(Next Route Handlers, Prisma, D1 컴포넌트, Vitest).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/services/quality-service.ts` (+test) | 검사 목록/등록·부적합 목록·PPM 요약 |
| `app/api/inspections/route.ts` | GET 목록 / POST 등록(OPERATOR+) |
| `app/api/quality/summary/route.ts` | GET PPM 요약 |
| `app/api/nonconformances/route.ts` | GET 부적합 목록 |
| `app/mockups/quality/page.tsx`(server) + `quality-client.tsx` | 품질 화면 |
| `app/mockups/layout.tsx` | (수정) 네비에 품질검사 추가 |

---

### Task 1: quality-service + 테스트

- [ ] **Step 1: `lib/services/quality-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { ppm } from "@/lib/domain/quality";
import type { InspectionType, InspectionResult } from "@/lib/domain/types";

export interface InspectionRow {
  id: string;
  type: InspectionType;
  result: InspectionResult;
  itemName: string;
  qty: number;
  defectQty: number;
  ppm: number;
  inspectedAt: string;
}

export async function listInspections(): Promise<InspectionRow[]> {
  const rows = await prisma.inspection.findMany({ include: { item: true }, orderBy: { inspectedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, type: r.type as InspectionType, result: r.result as InspectionResult,
    itemName: r.item.name, qty: r.qty, defectQty: r.defectQty, ppm: ppm(r.defectQty, r.qty),
    inspectedAt: r.inspectedAt.toISOString(),
  }));
}

export interface QualitySummary {
  totalQty: number;
  totalDefect: number;
  overallPpm: number;
  byType: { type: InspectionType; qty: number; defect: number; ppm: number }[];
}

export async function qualitySummary(): Promise<QualitySummary> {
  const rows = await prisma.inspection.findMany();
  const totalQty = rows.reduce((a, b) => a + b.qty, 0);
  const totalDefect = rows.reduce((a, b) => a + b.defectQty, 0);
  const types: InspectionType[] = ["RECEIVING", "PROCESS", "SHIPPING"];
  const byType = types.map((type) => {
    const t = rows.filter((r) => r.type === type);
    const qty = t.reduce((a, b) => a + b.qty, 0);
    const defect = t.reduce((a, b) => a + b.defectQty, 0);
    return { type, qty, defect, ppm: ppm(defect, qty) };
  });
  return { totalQty, totalDefect, overallPpm: ppm(totalDefect, totalQty), byType };
}

export interface NonconformanceRow {
  id: string;
  defectLabel: string;
  qty: number;
  action: string | null;
  status: string;
  createdAt: string;
}

export async function listNonconformances(): Promise<NonconformanceRow[]> {
  const rows = await prisma.nonconformance.findMany({ include: { defectCode: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, defectLabel: r.defectCode?.label ?? "—", qty: r.qty, action: r.action, status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface CreateInspectionInput {
  type: InspectionType;
  result: InspectionResult;
  itemId: string;
  qty: number;
  defectQty: number;
}
export async function createInspection(input: CreateInspectionInput) {
  if (input.qty < 0 || input.defectQty < 0) throw new Error("수량은 음수일 수 없습니다.");
  return prisma.inspection.create({ data: input });
}

export async function listItemsBrief() {
  return prisma.item.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } });
}
```

- [ ] **Step 2: 테스트 `lib/services/quality-service.test.ts`** (seed 대상, 읽기)
```ts
import { describe, it, expect } from "vitest";
import { qualitySummary, listInspections } from "@/lib/services/quality-service";

describe("quality-service", () => {
  it("검사 목록에 PPM이 계산된다", async () => {
    const rows = await listInspections();
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const first = rows[0];
    expect(first.ppm).toBe(Math.round((first.defectQty / first.qty) * 1_000_000));
  });
  it("PPM 요약 총계가 seed와 일치한다", async () => {
    const s = await qualitySummary();
    // seed: qty 100+80+50=230, defect 3+5+12=20
    expect(s.totalQty).toBe(230);
    expect(s.totalDefect).toBe(20);
    expect(s.overallPpm).toBe(86957);
  });
});
```
Run → FAIL(모듈) → 구현 후 PASS. (seed 상태 의존, 필요 시 `npm run db:seed` 먼저.)

- [ ] **Step 3: 확인 + Commit**
`npm test -- lib/services/quality-service.test.ts` PASS, `npx tsc --noEmit` 클린.
```bash
git add lib/services/quality-service.ts lib/services/quality-service.test.ts
git commit -m "feat(r2): 품질 서비스(검사·부적합·PPM 요약) + 테스트"
```

---

### Task 2: 품질 API

- [ ] **Step 1: `app/api/inspections/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listInspections, createInspection } from "@/lib/services/quality-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listInspections());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.result || !body?.itemId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "type·result·itemId·qty가 필요합니다." }, { status: 400 });
  }
  try {
    const ins = await createInspection({ type: body.type, result: body.result, itemId: body.itemId, qty: body.qty, defectQty: body.defectQty ?? 0 });
    return NextResponse.json(ins, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
```

- [ ] **Step 2: `app/api/quality/summary/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { qualitySummary } from "@/lib/services/quality-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await qualitySummary());
}
```

- [ ] **Step 3: `app/api/nonconformances/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { listNonconformances } from "@/lib/services/quality-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listNonconformances());
}
```

- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(라우트 확인).
```bash
git add app/api/inspections app/api/quality app/api/nonconformances
git commit -m "feat(r2): 품질 API(검사·PPM요약·부적합, RBAC)"
```

---

### Task 3: 품질 화면 + 네비

- [ ] **Step 1: `app/mockups/quality/page.tsx`** (server)
```tsx
import { qualitySummary, listInspections, listNonconformances, listItemsBrief } from "@/lib/services/quality-service";
import { QualityClient } from "./quality-client";
export const dynamic = "force-dynamic";
export default async function QualityPage() {
  const [summary, inspections, nonconformances, items] = await Promise.all([
    qualitySummary(), listInspections(), listNonconformances(), listItemsBrief(),
  ]);
  return <QualityClient summary={summary} inspections={inspections} nonconformances={nonconformances} items={items} />;
}
```

- [ ] **Step 2: `app/mockups/quality/quality-client.tsx`** (client) — 구성:
  - SectionHeader "품질 검사" + 우측 "검사 등록" Button(Dialog 오픈).
  - KPI 행: KPITile 3~4개 — 전체 PPM(overallPpm, tone crit/warn/ok by threshold), 유형별 PPM(공정/인수/출하) note.
  - 검사 DataTable: 유형(StatusPill: PASS ok/FAIL crit/SPECIAL warn via inspectionTone)·품목·수량·불량·PPM·일자. enableFilter.
  - 부적합 Card: 목록(불량코드·수량·상태 StatusPill·조치).
  - 검사 등록 Dialog: Select 검사유형(RECEIVING/PROCESS/SHIPPING)·판정(PASS/FAIL/SPECIAL)·품목(items)·수량 NumberStepper·불량 NumberStepper → POST /api/inspections → 성공 시 Dialog 닫고 Toast + router.refresh(); 403 처리.
  타입: `import type { QualitySummary, InspectionRow, NonconformanceRow } from "@/lib/services/quality-service"`. inspectionTone/StatusPill 재사용. ToastProvider로 감싸 useToast 사용(등록 폼). PPM tone helper: >=10000 crit, >=3000 warn, else ok.
  D1 컴포넌트만 사용, 토큰만.

- [ ] **Step 3: `app/mockups/layout.tsx` 네비 수정** — "품질·추적" 그룹 items에 `{ label: "품질검사", href: "/mockups/quality", icon: <ClipboardCheck 또는 기존 아이콘> }`를 "Lot 추적" 앞에 추가. CRUMB에 `"/mockups/quality": [{ label: "품질·추적" }, { label: "품질검사" }]` 추가. 아이콘 import 추가(lucide, 예: ClipboardCheck).

- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(/mockups/quality dynamic).
```bash
git add app/mockups/quality app/mockups/layout.tsx
git commit -m "feat(r2): 품질 화면(PPM KPI·검사 목록·부적합·검사 등록) + 네비"
```

---

### Task 4: 전체 검증 + 실렌더

- [ ] **Step 1** `npm run db:seed` → `npm test`(품질 서비스 포함 전체 통과, 카운트) → `npx tsc --noEmit` → `npm run build`.
- [ ] **Step 2 실렌더(Playwright)**: `npm run dev`(3001). admin 로그인 → `/mockups/quality`:
  - PPM KPI에 전체 PPM 86,957 표시. 검사 DataTable 3행(PASS/SPECIAL/FAIL StatusPill). 부적합 1건(치수불량 OPEN).
  - "검사 등록" → Dialog → 유형 PROCESS·판정 PASS·품목 선택·수량 100·불량 2 → 등록 → Toast, 목록 4행으로 증가.
  - viewer 로그인 → 등록 시 403 "권한 없음".
  Report ACTUAL. 종료 후 `npm run db:seed` 원복, `npx kill-port 3001`, 스크래치 삭제.
- [ ] **Step 3** 이슈 수정 시 별도 커밋.

---

## Self-Review 결과

**Spec 커버리지:** FR-QLT-1(검사 등록·현황) → service+API+화면 ✅ / FR-QLT-2(부적합 현황) → listNonconformances+화면 ✅ / FR-QLT-3(PPM) → ppm+summary+KPI ✅. RBAC(등록 OPERATOR+) ✅.
**플레이스홀더 스캔:** 없음. Task 3 화면은 상세 지침(컴포넌트·필드·tone)으로 명시.
**타입 일관성:** InspectionType/Result(domain)·QualitySummary/InspectionRow/NonconformanceRow(service) 재사용. ppm은 domain 함수 재사용.
**주의:** 화면은 server(force-dynamic)+client(Dialog 등록 POST). inspectionTone(D1-A) 매핑(PASS ok/FAIL crit/SPECIAL warn). seed 의존 테스트는 읽기.
**범위:** R2-B(품질). 이후 R2-C(설비보전) → R2-D(재고수불·OEE/알람 대시보드·감사로그·CSV).
