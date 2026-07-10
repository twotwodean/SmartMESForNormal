# R1-C API·서비스 계층 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** 생산 폐루프 API를 구축한다 — 조회(대시보드·작업지시·재고·Lot 계보)와 변경(작업지시 생성/상태전이, 생산실적 등록→재고·Lot 반영). 계층 분리(route → service → domain), RBAC 가드(변경은 OPERATOR+).

**Architecture:** `lib/services/*`가 Prisma 조회 + 도메인 순수함수(deriveStock·genealogy) 조합. Route Handler는 얇게(인증/권한 검사 + service 호출 + JSON). 변경 API는 `getCurrentUser`+`canAccess`로 403 가드, 쓰기는 Prisma `$transaction`으로 정합성 보장(NFR-REL-1: 재고=수불 합계). 생산실적 등록은 실적 + 재고txn(PRODUCE) + WO 상태전이를 원자적으로 수행.

**Tech Stack:** Next.js Route Handlers(nodejs runtime), Prisma, 기존 도메인/인증 모듈, Vitest.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/services/inventory-service.ts` (+test) | 품목별 현재고(파생) 목록, 품목 수불 이력 |
| `lib/services/work-order-service.ts` (+test) | 작업지시 목록/생성/상태전이 |
| `lib/services/production-service.ts` (+test) | 생산실적 등록(트랜잭션: 실적+재고txn+WO상태) |
| `lib/services/lot-service.ts` (+test) | Lot 계보 트리(조상/후손) |
| `lib/services/dashboard-service.ts` | 대시보드 집계(WO 상태별·재고 경고·라인) |
| `lib/api/guard.ts` | Route용 RBAC 가드 헬퍼(requireUser/requireRole) |
| `app/api/dashboard/route.ts` | GET 대시보드 |
| `app/api/work-orders/route.ts` | GET 목록 / POST 생성(OPERATOR+) |
| `app/api/work-orders/[id]/route.ts` | PATCH 상태전이(OPERATOR+) |
| `app/api/production/results/route.ts` | POST 실적 등록(OPERATOR+) |
| `app/api/inventory/route.ts` | GET 재고 |
| `app/api/lots/route.ts` · `app/api/lots/[id]/route.ts` | GET Lot 목록 / 계보 |

FR-PRD-2/3/6, FR-MAT-1(재고 조회), FR-DSH-1, FR-SEC-2(가드). 서비스 테스트는 seed된 dev.db 대상(읽기) + 등록은 트랜잭션 후 재seed.

---

### Task 1: RBAC 가드 헬퍼 + 조회 서비스/도메인 (inventory·lot·dashboard) + 테스트

**Files:** Create `lib/api/guard.ts`, `lib/services/inventory-service.ts`(+test), `lib/services/lot-service.ts`(+test), `lib/services/dashboard-service.ts`.

- [ ] **Step 1: `lib/api/guard.ts`**
```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccess } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/domain/types";
import type { SessionPayload } from "@/lib/auth/session";

/** 인증 필요. 미인증이면 { error 401 } 응답 반환(호출부에서 early return). */
export async function requireUser(): Promise<{ user: SessionPayload } | { res: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { res: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  return { user };
}

/** 최소 역할 요구. 부족하면 403. */
export async function requireRole(required: UserRole): Promise<{ user: SessionPayload } | { res: NextResponse }> {
  const r = await requireUser();
  if ("res" in r) return r;
  if (!canAccess(r.user.role, required)) {
    return { res: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return r;
}
```

- [ ] **Step 2: 실패 테스트 `lib/services/inventory-service.test.ts`** (seed된 dev.db 대상)
```ts
import { describe, it, expect } from "vitest";
import { listStock } from "@/lib/services/inventory-service";

describe("inventory-service.listStock", () => {
  it("품목별 파생 현재고와 상태를 반환한다", async () => {
    const rows = await listStock();
    const sus = rows.find((r) => r.code === "RM-SUS304");
    expect(sus).toBeDefined();
    expect(sus!.qty).toBe(180); // 1200 IN - 1020 CONSUME (seed)
    expect(sus!.status).toBe("BELOW"); // safety 250
    const gb = rows.find((r) => r.code === "FG-GB2500");
    expect(gb!.status).toBe("NORMAL");
  });
});
```
> 주의: 이 테스트는 seed된 dev.db에 의존한다. 실행 전 DB가 seed 상태여야 함(플랜 R1-A/B에서 seed 완료). 테스트는 읽기 전용이라 데이터를 변경하지 않는다.

Run `npm test -- lib/services/inventory-service.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: `lib/services/inventory-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { deriveStock } from "@/lib/domain/stock";
import type { StockStatus } from "@/lib/domain/types";

export interface StockRow {
  itemId: string;
  code: string;
  name: string;
  uom: string;
  qty: number;
  safety: number;
  status: StockStatus;
}

function stockStatus(qty: number, safety: number): StockStatus {
  if (qty < 0) return "NEGATIVE";
  if (qty < safety) return "BELOW";
  return "NORMAL";
}

/** 품목별 현재고(수불 파생) + 안전재고 상태 */
export async function listStock(): Promise<StockRow[]> {
  const [items, txns] = await Promise.all([
    prisma.item.findMany({ orderBy: { code: "asc" } }),
    prisma.inventoryTxn.findMany({ select: { itemId: true, qty: true } }),
  ]);
  const stock = deriveStock(txns);
  return items.map((it) => {
    const qty = stock.get(it.id) ?? 0;
    return { itemId: it.id, code: it.code, name: it.name, uom: it.uom, qty, safety: it.safetyStock, status: stockStatus(qty, it.safetyStock) };
  });
}

/** 품목 수불 이력(최신순) */
export async function listTxns(itemId: string) {
  return prisma.inventoryTxn.findMany({ where: { itemId }, orderBy: { createdAt: "desc" } });
}
```
Run → PASS.

- [ ] **Step 4: 실패 테스트 `lib/services/lot-service.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { lotTree } from "@/lib/services/lot-service";

describe("lot-service.lotTree", () => {
  it("seed된 Lot 계보를 조상/후손으로 반환한다", async () => {
    // seed: LOT-2600701(원자재) → LOT-2600712(반제품)
    const tree = await lotTree("LOT-2600712");
    expect(tree).toBeDefined();
    expect(tree!.code).toBe("LOT-2600712");
    expect(tree!.ancestors.map((a) => a.code)).toContain("LOT-2600701");
  });
});
```
Run → FAIL.

- [ ] **Step 5: `lib/services/lot-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { ancestors, descendants } from "@/lib/domain/genealogy";

export interface LotRef {
  id: string;
  code: string;
  itemName: string;
  status: string;
}
export interface LotTree {
  id: string;
  code: string;
  itemName: string;
  status: string;
  ancestors: LotRef[];
  descendants: LotRef[];
}

export async function listLots(): Promise<LotRef[]> {
  const lots = await prisma.lot.findMany({ include: { item: true }, orderBy: { createdAt: "desc" } });
  return lots.map((l) => ({ id: l.id, code: l.code, itemName: l.item.name, status: l.status }));
}

/** code로 Lot 조회 + 계보(조상/후손) */
export async function lotTree(code: string): Promise<LotTree | null> {
  const lot = await prisma.lot.findUnique({ where: { code }, include: { item: true } });
  if (!lot) return null;
  const links = await prisma.lotGenealogy.findMany();
  const ancIds = ancestors(lot.id, links);
  const descIds = descendants(lot.id, links);
  const refLots = await prisma.lot.findMany({ where: { id: { in: [...ancIds, ...descIds] } }, include: { item: true } });
  const toRef = (id: string): LotRef | undefined => {
    const l = refLots.find((x) => x.id === id);
    return l ? { id: l.id, code: l.code, itemName: l.item.name, status: l.status } : undefined;
  };
  return {
    id: lot.id, code: lot.code, itemName: lot.item.name, status: lot.status,
    ancestors: ancIds.map(toRef).filter((x): x is LotRef => Boolean(x)),
    descendants: descIds.map(toRef).filter((x): x is LotRef => Boolean(x)),
  };
}
```
Run → PASS.

- [ ] **Step 6: `lib/services/dashboard-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { listStock } from "@/lib/services/inventory-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

export interface DashboardData {
  workOrders: { total: number; byStatus: Record<WorkOrderStatus, number> };
  stockWarnings: { code: string; name: string; qty: number; safety: number; status: string }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const [wos, stock] = await Promise.all([prisma.workOrder.findMany({ select: { status: true } }), listStock()]);
  const byStatus: Record<WorkOrderStatus, number> = { WAITING: 0, RUNNING: 0, DONE: 0, CANCELLED: 0 };
  for (const w of wos) byStatus[w.status as WorkOrderStatus] = (byStatus[w.status as WorkOrderStatus] ?? 0) + 1;
  const stockWarnings = stock.filter((s) => s.status !== "NORMAL").map((s) => ({ code: s.code, name: s.name, qty: s.qty, safety: s.safety, status: s.status }));
  return { workOrders: { total: wos.length, byStatus }, stockWarnings };
}
```

- [ ] **Step 7: 확인 + Commit**
Run `npm test -- lib/services` → inventory·lot 테스트 통과. Run `npx tsc --noEmit` (클린).
```bash
git add lib/api/guard.ts lib/services/inventory-service.ts lib/services/inventory-service.test.ts lib/services/lot-service.ts lib/services/lot-service.test.ts lib/services/dashboard-service.ts
git commit -m "feat(r1): 조회 서비스(재고·Lot계보·대시보드) + RBAC 가드 헬퍼 + 테스트"
```

---

### Task 2: 작업지시·생산실적 서비스(변경) + 테스트

**Files:** Create `lib/services/work-order-service.ts`(+test), `lib/services/production-service.ts`(+test).

- [ ] **Step 1: `lib/services/work-order-service.ts`**
```ts
import { prisma } from "@/lib/db";
import type { WorkOrderStatus } from "@/lib/domain/types";

export interface WorkOrderRow {
  id: string;
  code: string;
  itemName: string;
  qty: number;
  status: WorkOrderStatus;
  center: string;
}

export async function listWorkOrders(): Promise<WorkOrderRow[]> {
  const wos = await prisma.workOrder.findMany({ include: { item: true, workCenter: true }, orderBy: { createdAt: "desc" } });
  return wos.map((w) => ({
    id: w.id, code: w.code, itemName: w.item.name, qty: w.qty,
    status: w.status as WorkOrderStatus, center: w.workCenter?.name ?? "—",
  }));
}

const VALID: WorkOrderStatus[] = ["WAITING", "RUNNING", "DONE", "CANCELLED"];

export async function updateStatus(id: string, status: string) {
  if (!VALID.includes(status as WorkOrderStatus)) throw new Error(`잘못된 상태: ${status}`);
  return prisma.workOrder.update({ where: { id }, data: { status } });
}

let woSeq = 0;
export async function createWorkOrder(input: { itemId: string; qty: number; workCenterId?: string }) {
  woSeq += 1;
  const code = `WO-${Date.now().toString().slice(-6)}-${String(woSeq).padStart(3, "0")}`;
  return prisma.workOrder.create({ data: { code, itemId: input.itemId, qty: input.qty, workCenterId: input.workCenterId, status: "WAITING" } });
}
```

- [ ] **Step 2: `lib/services/production-service.ts`**
```ts
import { prisma } from "@/lib/db";

export interface RegisterResultInput {
  workOrderId: string;
  goodQty: number;
  defectQty?: number;
  downtimeMin?: number;
}

/**
 * 생산실적 등록(원자적):
 * 1) ProductionResult 생성
 * 2) 양품 수량만큼 완제품 재고 IN(PRODUCE) 트랜잭션
 * 3) WO가 WAITING이면 RUNNING으로 전이
 * 반환: 생성된 result + 갱신된 WO
 */
export async function registerResult(input: RegisterResultInput) {
  const { workOrderId, goodQty } = input;
  const defectQty = input.defectQty ?? 0;
  const downtimeMin = input.downtimeMin ?? 0;
  if (goodQty < 0 || defectQty < 0) throw new Error("수량은 음수일 수 없습니다.");

  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) throw new Error("작업지시를 찾을 수 없습니다.");

    const result = await tx.productionResult.create({
      data: { workOrderId, goodQty, defectQty, downtimeMin },
    });

    if (goodQty > 0) {
      await tx.inventoryTxn.create({
        data: { itemId: wo.itemId, qty: goodQty, type: "PRODUCE", ref: wo.code },
      });
    }

    const updated = wo.status === "WAITING"
      ? await tx.workOrder.update({ where: { id: workOrderId }, data: { status: "RUNNING" } })
      : wo;

    return { result, workOrder: updated };
  });
}
```

- [ ] **Step 3: 통합 테스트 `lib/services/production-service.test.ts`** (dev.db에 쓰고 검증 후 재seed로 원복)
```ts
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { registerResult } from "@/lib/services/production-service";
import { listStock } from "@/lib/services/inventory-service";

// 이 테스트는 seed된 dev.db를 변경한다. 종료 후 재seed로 원복.
afterAll(() => {
  execSync("npm run db:seed", { stdio: "ignore" });
});

describe("production-service.registerResult", () => {
  it("실적 등록 시 완제품 재고가 양품만큼 증가하고 WO가 RUNNING이 된다", async () => {
    const wo = await prisma.workOrder.findFirstOrThrow({ where: { code: "WO-260709-011" } });
    const before = (await listStock()).find((s) => s.itemId === wo.itemId)!.qty;

    const { workOrder } = await registerResult({ workOrderId: wo.id, goodQty: 50, defectQty: 2 });
    expect(workOrder.status).toBe("RUNNING");

    const after = (await listStock()).find((s) => s.itemId === wo.itemId)!.qty;
    expect(after).toBe(before + 50);
  });
});
```
Run `npm test -- lib/services/production-service.test.ts` → 먼저 FAIL(모듈), 구현 후 PASS. (afterAll이 재seed하므로 다른 서비스 테스트에 영향 없음.)

- [ ] **Step 4: 확인 + Commit**
Run `npm test -- lib/services` → 전체 서비스 테스트 통과. Run `npx tsc --noEmit` (클린). 재seed 확인(`npm run db:seed`).
```bash
git add lib/services/work-order-service.ts lib/services/production-service.ts lib/services/production-service.test.ts
git commit -m "feat(r1): 작업지시(생성/상태전이)·생산실적 등록 서비스(트랜잭션) + 테스트"
```

---

### Task 3: API Route Handlers (조회 + 변경, RBAC 가드)

**Files:** Create route handlers under `app/api/`.

- [ ] **Step 1: `app/api/dashboard/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { getDashboard } from "@/lib/services/dashboard-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await getDashboard());
}
```

- [ ] **Step 2: `app/api/inventory/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { listStock } from "@/lib/services/inventory-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listStock());
}
```

- [ ] **Step 3: `app/api/lots/route.ts` + `app/api/lots/[id]/route.ts`**
`route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { listLots } from "@/lib/services/lot-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listLots());
}
```
`[id]/route.ts` (id = lot code):
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { lotTree } from "@/lib/services/lot-service";
export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const tree = await lotTree(params.id);
  if (!tree) return NextResponse.json({ error: "Lot을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(tree);
}
```

- [ ] **Step 4: `app/api/work-orders/route.ts` + `app/api/work-orders/[id]/route.ts`**
`route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listWorkOrders, createWorkOrder } from "@/lib/services/work-order-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listWorkOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.itemId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "itemId와 qty가 필요합니다." }, { status: 400 });
  }
  const wo = await createWorkOrder({ itemId: body.itemId, qty: body.qty, workCenterId: body.workCenterId });
  return NextResponse.json(wo, { status: 201 });
}
```
`[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateStatus } from "@/lib/services/work-order-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.status) return NextResponse.json({ error: "status가 필요합니다." }, { status: 400 });
  try {
    const wo = await updateStatus(params.id, body.status);
    return NextResponse.json(wo);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
```

- [ ] **Step 5: `app/api/production/results/route.ts`**
```ts
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { registerResult } from "@/lib/services/production-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.workOrderId || typeof body.goodQty !== "number") {
    return NextResponse.json({ error: "workOrderId와 goodQty가 필요합니다." }, { status: 400 });
  }
  try {
    const out = await registerResult({
      workOrderId: body.workOrderId, goodQty: body.goodQty,
      defectQty: body.defectQty, downtimeMin: body.downtimeMin,
    });
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
```

- [ ] **Step 6: 검증 + Commit**
Run `npx tsc --noEmit` (클린), `npm run build` (성공 — 위 API 라우트가 목록에 표시). Do NOT run dev server here.
```bash
git add app/api/dashboard app/api/inventory app/api/lots app/api/work-orders app/api/production
git commit -m "feat(r1): 생산 폐루프 API(대시보드·재고·Lot·작업지시·실적, RBAC 가드)"
```

---

### Task 4: 전체 검증 + API 실동작(Playwright/fetch)

- [ ] **Step 1: 게이트**
`npm run db:seed`(초기화) → `npm test`(도메인+서비스 포함 전체 통과, 카운트 보고) → `npx tsc --noEmit`(클린) → `npm run build`(성공).

- [ ] **Step 2: API 실동작 (Next dev + Playwright request)**
Start `npm run dev`(3001). Playwright request 컨텍스트로:
- 미인증 `GET /api/dashboard` → 401.
- `POST /api/auth/login` admin/admin123 → 쿠키 획득.
- `GET /api/inventory` → RM-SUS304 qty 180 status BELOW 확인.
- `GET /api/work-orders` → seed WO 포함 목록.
- `GET /api/dashboard` → workOrders.byStatus + stockWarnings 포함.
- `GET /api/lots/LOT-2600712` → ancestors에 LOT-2600701 포함.
- **폐루프**: `GET /api/inventory`로 완제품(FG-GB2500) 현재고 확인 → `POST /api/production/results` {workOrderId(=seed WO id), goodQty:50} → 201 → `GET /api/inventory` 재조회 시 해당 품목 +50 확인.
- **RBAC**: viewer/view123 로그인 후 `POST /api/production/results` → 403.
Report ACTUAL(상태코드·수량 변화). 종료 후 `npm run db:seed`로 원복, `npx kill-port 3001`(no bulk node kill), 스크래치 삭제.

- [ ] **Step 3:** 이슈 수정 시 별도 커밋 후 재확인.

---

## Self-Review 결과

**Spec 커버리지:**
- FR-PRD-2(작업지시 발행·현황) → work-order-service + API ✅
- FR-PRD-3(생산실적 등록) → production-service(트랜잭션) + API ✅
- FR-PRD-6(재공/집계) 일부·FR-MAT-1(재고 현황) → inventory-service ✅
- FR-PRD-5(Lot 추적) → lot-service(계보) ✅
- FR-DSH-1(실시간 생산현황) → dashboard-service ✅
- FR-SEC-2(라우트 가드 401/403) → guard.ts + 각 route ✅
- NFR-REL-1(재고=수불 합계, 트랜잭션) → registerResult $transaction ✅
- NFR-MNT-1(route/service/domain 계층) ✅

**플레이스홀더 스캔:** 없음.

**타입 일관성:** service 반환 타입(StockRow/WorkOrderRow/LotTree/DashboardData) 명시. guard 반환 유니온(`{user}` | `{res}`)을 route에서 `"res" in auth`로 분기. `WorkOrderStatus`/`StockStatus` 도메인 타입 재사용. registerResult 시그니처가 service·API·테스트에서 동일.

**주의:** 서비스 테스트는 seed된 dev.db 의존(읽기). production 테스트는 쓰기 후 afterAll 재seed로 원복. 모든 API는 nodejs runtime(prisma). 변경 API는 OPERATOR+ 가드.

**범위:** R1-C(API·서비스). 이후 R1-D: 목업 7화면을 이 API에 연동(정적 목데이터 → 실데이터 fetch), 로그인 사용자/역할 UI 반영, 폐루프 실동작.
