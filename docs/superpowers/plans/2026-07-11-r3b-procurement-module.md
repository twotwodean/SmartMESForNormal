# R3-B 자재구매 모듈(발주·입고) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** FR-MAT-2 — 구매 발주 등록·현황, 입고 처리(재고 반영), 발주대비 입고현황.

**Architecture:** procurement-service가 Prisma + 도메인(receiptProgress·poStatusFor) 조합. 입고 처리는 `$transaction`: GoodsReceipt 생성 + InventoryTxn(IN) + PO 상태 갱신. API 조회(requireUser)+변경(requireRole OPERATOR)+audit. 화면(/mockups/procurement): 발주 목록(진척바)·발주 등록 Dialog·입고 처리. 네비 "자재관리 > 구매/발주".

**Tech Stack:** 기존 스택.

---

## File Structure
| 파일 | 책임 |
|---|---|
| `lib/services/procurement-service.ts` (+test) | 발주 목록/생성·입고처리(트랜잭션)·거래처 |
| `app/api/suppliers/route.ts` | GET 거래처 |
| `app/api/purchase-orders/route.ts` | GET/POST 발주 |
| `app/api/goods-receipts/route.ts` | POST 입고 처리(OPERATOR+) |
| `app/mockups/procurement/page.tsx`+client | 구매 화면 |
| `app/mockups/layout.tsx` | (수정) 네비 구매/발주 |

---

### Task 1: procurement-service + 테스트

- [ ] **Step 1: `lib/services/procurement-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { receiptProgress, poStatusFor } from "@/lib/domain/procurement";
import type { PurchaseOrderStatus, SupplierType } from "@/lib/domain/types";

export interface PurchaseOrderRow {
  id: string;
  code: string;
  supplierName: string;
  itemName: string;
  qty: number;
  received: number;
  progress: number;
  status: PurchaseOrderStatus;
  orderedAt: string;
}

export async function listPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const rows = await prisma.purchaseOrder.findMany({ include: { supplier: true, item: true, receipts: true }, orderBy: { orderedAt: "desc" } });
  return rows.map((r) => {
    const received = r.receipts.reduce((a, b) => a + b.qty, 0);
    return {
      id: r.id, code: r.code, supplierName: r.supplier.name, itemName: r.item.name,
      qty: r.qty, received, progress: receiptProgress(r.qty, received),
      status: r.status as PurchaseOrderStatus, orderedAt: r.orderedAt.toISOString(),
    };
  });
}

export interface SupplierRow { id: string; code: string; name: string; type: SupplierType; }
export async function listSuppliers(type?: SupplierType): Promise<SupplierRow[]> {
  const rows = await prisma.supplier.findMany({ where: type ? { type } : undefined, orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type as SupplierType }));
}

let poSeq = 0;
export async function createPurchaseOrder(input: { supplierId: string; itemId: string; qty: number }) {
  poSeq += 1;
  const code = `PO-${Date.now().toString().slice(-6)}-${String(poSeq).padStart(3, "0")}`;
  return prisma.purchaseOrder.create({ data: { code, supplierId: input.supplierId, itemId: input.itemId, qty: input.qty, status: "ORDERED" } });
}

let grSeq = 0;
/** 입고 처리(원자적): GoodsReceipt + 재고 IN txn + PO 상태 갱신 */
export async function receiveGoods(input: { purchaseOrderId: string; qty: number }) {
  if (input.qty <= 0) throw new Error("입고 수량은 1 이상이어야 합니다.");
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id: input.purchaseOrderId }, include: { receipts: true } });
    if (!po) throw new Error("발주를 찾을 수 없습니다.");
    grSeq += 1;
    const code = `GR-${Date.now().toString().slice(-6)}-${String(grSeq).padStart(3, "0")}`;
    const gr = await tx.goodsReceipt.create({ data: { code, purchaseOrderId: po.id, itemId: po.itemId, qty: input.qty } });
    await tx.inventoryTxn.create({ data: { itemId: po.itemId, qty: input.qty, type: "IN", ref: po.code } });
    const received = po.receipts.reduce((a, b) => a + b.qty, 0) + input.qty;
    const updated = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: poStatusFor(po.qty, received) } });
    return { receipt: gr, purchaseOrder: updated };
  });
}
```

- [ ] **Step 2: 테스트 `lib/services/procurement-service.test.ts`** (afterAll 재seed)
```ts
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listPurchaseOrders, receiveGoods } from "@/lib/services/procurement-service";
import { listStock } from "@/lib/services/inventory-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("procurement-service", () => {
  it("발주 목록에 입고 진척률이 계산된다(seed PO-2607-002 = 300/200 → 67, PARTIAL)", async () => {
    const rows = await listPurchaseOrders();
    const po = rows.find((r) => r.code === "PO-2607-002")!;
    expect(po.received).toBe(200);
    expect(po.progress).toBe(67);
    expect(po.status).toBe("PARTIAL");
  });
  it("입고 처리 시 재고가 늘고 PO 상태가 갱신된다", async () => {
    const po = await prisma.purchaseOrder.findFirstOrThrow({ where: { code: "PO-2607-002" } });
    const before = (await listStock()).find((s) => s.itemId === po.itemId)!.qty;
    const { purchaseOrder } = await receiveGoods({ purchaseOrderId: po.id, qty: 100 }); // 200+100=300 → RECEIVED
    expect(purchaseOrder.status).toBe("RECEIVED");
    const after = (await listStock()).find((s) => s.itemId === po.itemId)!.qty;
    expect(after).toBe(before + 100);
  });
});
```
Run → FAIL(모듈) → 구현 후 PASS(2). (afterAll 재seed로 원복.)

- [ ] **Step 3: 확인 + Commit** — `npm run db:seed` → `npm test -- lib/services/procurement-service.test.ts` PASS → `npx tsc --noEmit` 클린.
```bash
git add lib/services/procurement-service.ts lib/services/procurement-service.test.ts
git commit -m "feat(r3): 구매 서비스(발주 목록/생성·입고처리 트랜잭션·거래처) + 테스트"
```

---

### Task 2: 구매 API

- [ ] **Step 1: `app/api/suppliers/route.ts`** (GET listSuppliers, requireUser; ?type= 필터 지원, runtime nodejs).
- [ ] **Step 2: `app/api/purchase-orders/route.ts`** (GET listPurchaseOrders requireUser; POST createPurchaseOrder requireRole OPERATOR, body {supplierId,itemId,qty}, 400 검증, 201).
- [ ] **Step 3: `app/api/goods-receipts/route.ts`** (POST requireRole OPERATOR, body {purchaseOrderId, qty}, receiveGoods + audit("GOODS_RECEIPT","GoodsReceipt",receipt.id), try/catch 400, 201).
guard 패턴·runtime nodejs 통일.
- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(3 라우트).
```bash
git add app/api/suppliers app/api/purchase-orders app/api/goods-receipts
git commit -m "feat(r3): 구매 API(거래처·발주·입고, RBAC+audit)"
```

---

### Task 3: 구매 화면 + 네비

- [ ] **Step 1: `app/mockups/procurement/page.tsx`** (server, force-dynamic) — listPurchaseOrders()·listSuppliers("SUPPLIER")·listItemsBrief(quality-service의 것 재사용 또는 inventory에서 품목) 병렬 → client. (품목 목록은 `listItemsBrief` from quality-service 재사용 가능; import 경로 확인.)
- [ ] **Step 2: `app/mockups/procurement/procurement-client.tsx`** (client, ToastProvider):
  - SectionHeader "구매 · 발주" + actions "발주 등록" Button(Dialog).
  - KPI: 발주 총건·입고완료(RECEIVED count)·부분입고(PARTIAL)·미입고(ORDERED) — 간단 KPITile 또는 요약.
  - 발주 DataTable: 발주번호·거래처·품목·발주량·입고량·진척(ProgressBar value=progress + %)·상태(StatusPill: ORDERED neutral/PARTIAL warn/RECEIVED ok/CANCELLED neutral)·발주일. 각 행 상태!=RECEIVED면 "입고" Button → 입고 수량 입력(간단히 남은수량 default) prompt 대신 작은 입고 Dialog(수량 NumberStepper) → POST /api/goods-receipts → Toast+refresh; 403.
  - 발주 등록 Dialog: 거래처 Select·품목 Select·수량 NumberStepper → POST /api/purchase-orders → Toast+refresh; 403.
  D1 컴포넌트만·토큰만·no any. 상태→tone 매핑 로컬 helper.
- [ ] **Step 3: `app/mockups/layout.tsx` 네비** — "재고관리" 그룹 items에 `{ label:"구매/발주", href:"/mockups/procurement", icon: ShoppingCart }` 추가(재고 현황 뒤). CRUMB `"/mockups/procurement":[{label:"재고관리"},{label:"구매/발주"}]`. lucide ShoppingCart import.
- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(/mockups/procurement dynamic).
```bash
git add app/mockups/procurement app/mockups/layout.tsx
git commit -m "feat(r3): 구매 화면(발주 현황·진척·발주등록·입고처리) + 네비"
```

---

### Task 4: 전체 검증 + 실렌더
- [ ] **Step 1** `npm run db:seed` → `npm test`(구매 서비스 포함 통과, 카운트) → `npx tsc --noEmit` → `npm run build`.
- [ ] **Step 2 실렌더(Playwright)** `npm run dev`(3001). admin → `/mockups/procurement`:
  - 발주 2건, PO-2607-002 진척 67%·PARTIAL 표시.
  - PO-2607-002 "입고" → 수량 100 → 등록 → Toast, 진척 100%·RECEIVED로 갱신. (재고관리 화면에서 AL6061 재고 +100 확인 가능.)
  - "발주 등록" → 거래처·품목·수량 → 등록 → 목록 증가.
  - viewer → 입고/발주 403.
  Report ACTUAL. 종료 후 `npm run db:seed`, `npx kill-port 3001`, 스크래치 삭제.
- [ ] **Step 3** 이슈 수정 시 별도 커밋.

---

## Self-Review 결과
**Spec 커버리지:** FR-MAT-2(구매의뢰·발주·입고, 발주대비 입고현황) → 발주 CRUD + receiveGoods(재고 반영) + progress ✅. RBAC(변경 OPERATOR+)+audit ✅.
**플레이스홀더 스캔:** 없음(Task 3 상세 지침).
**타입 일관성:** PurchaseOrderStatus·SupplierType(domain)·PurchaseOrderRow/SupplierRow(service) 재사용. receiptProgress/poStatusFor domain 재사용. receiveGoods $transaction으로 재고=수불 정합.
**주의:** procurement-service.test.ts 쓰기 테스트라 afterAll 재seed. 입고 시 InventoryTxn IN 생성으로 재고 파생 정합. server(force-dynamic)+client(POST).
**범위:** R3-B(구매). 이후 R3-C(영업: 수주·출하) → R3-D(특채·모델/도면).
