# R3-C 영업 모듈(수주·출하) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** FR-SAL-1~2 — 수주 등록·현황, 출하요청·출하등록·출하현황·반품.

**Architecture:** sales-service가 Prisma 조합. 출하등록은 `$transaction`: Shipment 상태 SHIPPED + shippedAt + 완제품 재고 OUT txn. 반품은 상태 RETURNED + 재고 IN. API 조회(requireUser)+변경(requireRole OPERATOR)+audit. 화면(/mockups/sales): 수주 목록·수주 등록, 출하 목록·출하요청·출하처리/반품. 네비 "영업관리 > 수주/출하".

**Tech Stack:** 기존 스택.

---

## File Structure
| 파일 | 책임 |
|---|---|
| `lib/services/sales-service.ts` (+test) | 수주 목록/생성·출하 목록/요청·출하처리(트랜잭션)/반품·고객 |
| `app/api/sales-orders/route.ts` | GET/POST 수주 |
| `app/api/shipments/route.ts` | GET/POST 출하요청 |
| `app/api/shipments/[id]/route.ts` | PATCH 출하/반품(OPERATOR+) |
| `app/mockups/sales/page.tsx`+client | 영업 화면 |
| `app/mockups/layout.tsx` | (수정) 네비 수주/출하 |

---

### Task 1: sales-service + 테스트

- [ ] **Step 1: `lib/services/sales-service.ts`**
```ts
import { prisma } from "@/lib/db";
import type { SalesOrderStatus, ShipmentStatus } from "@/lib/domain/types";

export interface SalesOrderRow {
  id: string; code: string; customerName: string; itemName: string;
  qty: number; status: SalesOrderStatus; dueDate: string;
}
export async function listSalesOrders(): Promise<SalesOrderRow[]> {
  const rows = await prisma.salesOrder.findMany({ include: { customer: true, item: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, code: r.code, customerName: r.customer.name, itemName: r.item.name,
    qty: r.qty, status: r.status as SalesOrderStatus, dueDate: r.dueDate.toISOString(),
  }));
}

let soSeq = 0;
export async function createSalesOrder(input: { customerId: string; itemId: string; qty: number; dueDate: string }) {
  soSeq += 1;
  const code = `SO-${Date.now().toString().slice(-6)}-${String(soSeq).padStart(3, "0")}`;
  return prisma.salesOrder.create({ data: { code, customerId: input.customerId, itemId: input.itemId, qty: input.qty, dueDate: new Date(input.dueDate), status: "ORDERED" } });
}

export interface ShipmentRow {
  id: string; code: string; itemName: string; qty: number; status: ShipmentStatus;
  salesOrderCode: string | null; shippedAt: string | null;
}
export async function listShipments(): Promise<ShipmentRow[]> {
  const rows = await prisma.shipment.findMany({ include: { item: true, salesOrder: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, code: r.code, itemName: r.item.name, qty: r.qty, status: r.status as ShipmentStatus,
    salesOrderCode: r.salesOrder?.code ?? null, shippedAt: r.shippedAt?.toISOString() ?? null,
  }));
}

let shSeq = 0;
export async function createShipment(input: { salesOrderId: string; qty: number }) {
  const so = await prisma.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } });
  shSeq += 1;
  const code = `SH-${Date.now().toString().slice(-6)}-${String(shSeq).padStart(3, "0")}`;
  return prisma.shipment.create({ data: { code, salesOrderId: so.id, itemId: so.itemId, qty: input.qty, status: "REQUESTED" } });
}

/** 출하등록: Shipment SHIPPED + shippedAt + 완제품 재고 OUT */
export async function shipShipment(id: string) {
  return prisma.$transaction(async (tx) => {
    const sh = await tx.shipment.findUnique({ where: { id } });
    if (!sh) throw new Error("출하를 찾을 수 없습니다.");
    if (sh.status !== "REQUESTED") throw new Error("이미 처리된 출하입니다.");
    await tx.inventoryTxn.create({ data: { itemId: sh.itemId, qty: -sh.qty, type: "OUT", ref: sh.code } });
    return tx.shipment.update({ where: { id }, data: { status: "SHIPPED", shippedAt: new Date() } });
  });
}

/** 반품: Shipment RETURNED + 재고 IN 복원 */
export async function returnShipment(id: string) {
  return prisma.$transaction(async (tx) => {
    const sh = await tx.shipment.findUnique({ where: { id } });
    if (!sh) throw new Error("출하를 찾을 수 없습니다.");
    if (sh.status !== "SHIPPED") throw new Error("출하 완료건만 반품 가능합니다.");
    await tx.inventoryTxn.create({ data: { itemId: sh.itemId, qty: sh.qty, type: "IN", ref: `${sh.code}-RET` } });
    return tx.shipment.update({ where: { id }, data: { status: "RETURNED" } });
  });
}
```

- [ ] **Step 2: 테스트 `lib/services/sales-service.test.ts`** (afterAll 재seed)
```ts
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listSalesOrders, shipShipment } from "@/lib/services/sales-service";
import { listStock } from "@/lib/services/inventory-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("sales-service", () => {
  it("수주 목록에 고객·품목이 포함된다(seed SO-2607-001)", async () => {
    const rows = await listSalesOrders();
    const so = rows.find((r) => r.code === "SO-2607-001")!;
    expect(so.customerName).toBe("한빛기계");
    expect(so.qty).toBe(200);
  });
  it("출하등록 시 상태 SHIPPED + 완제품 재고 감소", async () => {
    const sh = await prisma.shipment.findFirstOrThrow({ where: { code: "SH-2607-001" } });
    const before = (await listStock()).find((s) => s.itemId === sh.itemId)!.qty;
    const updated = await shipShipment(sh.id);
    expect(updated.status).toBe("SHIPPED");
    const after = (await listStock()).find((s) => s.itemId === sh.itemId)!.qty;
    expect(after).toBe(before - sh.qty); // 120 출하
  });
});
```
Run → FAIL(모듈) → 구현 후 PASS(2). (afterAll 재seed.)

- [ ] **Step 3: 확인 + Commit** — `npm run db:seed` → `npm test -- lib/services/sales-service.test.ts` PASS → `npx tsc --noEmit` 클린.
```bash
git add lib/services/sales-service.ts lib/services/sales-service.test.ts
git commit -m "feat(r3): 영업 서비스(수주·출하요청·출하등록/반품 트랜잭션) + 테스트"
```

---

### Task 2: 영업 API

- [ ] **Step 1: `app/api/sales-orders/route.ts`** (GET listSalesOrders requireUser; POST createSalesOrder requireRole OPERATOR, body {customerId,itemId,qty,dueDate}, 400 검증, 201).
- [ ] **Step 2: `app/api/shipments/route.ts`** (GET listShipments requireUser; POST createShipment requireRole OPERATOR, body {salesOrderId,qty}, 400, 201).
- [ ] **Step 3: `app/api/shipments/[id]/route.ts`** (PATCH requireRole OPERATOR, body {action:"ship"|"return"} → shipShipment/returnShipment + audit("SHIPMENT",...), try/catch 400).
guard 패턴·runtime nodejs 통일. 거래처(고객)는 기존 `/api/suppliers?type=CUSTOMER` 재사용(신규 라우트 불필요).
- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(3 라우트).
```bash
git add app/api/sales-orders app/api/shipments
git commit -m "feat(r3): 영업 API(수주·출하·출하처리/반품, RBAC+audit)"
```

---

### Task 3: 영업 화면 + 네비

- [ ] **Step 1: `app/mockups/sales/page.tsx`** (server, force-dynamic) — listSalesOrders()·listShipments()·listSuppliers("CUSTOMER")(procurement-service)·listItemsBrief(quality-service) 병렬 → client.
- [ ] **Step 2: `app/mockups/sales/sales-client.tsx`** (client, ToastProvider):
  - SectionHeader "영업 · 수주/출하" + actions "수주 등록" Button(Dialog).
  - Tabs("수주"/"출하") 또는 2섹션.
  - 수주 DataTable: 수주번호·고객·품목·수량·상태(StatusPill: ORDERED neutral/PRODUCING primary/SHIPPED ok/CANCELLED neutral)·납기(dueDate slice0,10)·액션("출하요청" Button → 출하요청 Dialog(수량) POST /api/shipments).
  - 출하 DataTable: 출하번호·수주·품목·수량·상태(StatusPill: REQUESTED warn/SHIPPED ok/RETURNED neutral)·출하일·액션(REQUESTED→"출하" PATCH ship; SHIPPED→"반품" PATCH return).
  - 수주 등록 Dialog: 고객 Select·품목 Select·수량 NumberStepper·납기 DatePicker(또는 Input date) → POST /api/sales-orders.
  모든 변경 성공 시 Toast+router.refresh; 403 처리. D1 컴포넌트만·토큰만·no any.
  (납기 입력은 D1 DatePicker 사용; value Date → onChange → ISO 문자열 전송. DatePicker 없으면 Input type=date.)
- [ ] **Step 3: `app/mockups/layout.tsx` 네비** — 새 그룹 `{ label:"영업관리", items:[{ label:"수주/출하", href:"/mockups/sales", icon: Truck }] }` 추가. CRUMB `"/mockups/sales":[{label:"영업관리"},{label:"수주/출하"}]`. lucide Truck import.
- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(/mockups/sales dynamic).
```bash
git add app/mockups/sales app/mockups/layout.tsx
git commit -m "feat(r3): 영업 화면(수주·출하·출하처리/반품) + 네비"
```

---

### Task 4: 전체 검증 + 실렌더
- [ ] **Step 1** `npm run db:seed` → `npm test`(영업 서비스 포함 통과, 카운트) → `npx tsc --noEmit` → `npm run build`.
- [ ] **Step 2 실렌더(Playwright)** `npm run dev`(3001). admin → `/mockups/sales`:
  - 수주 SO-2607-001(한빛기계·기어박스·200) 표시. 출하 SH-2607-001(REQUESTED) 표시.
  - SH-2607-001 "출하" → Toast, 상태 SHIPPED. (재고 화면에서 완제품 -120 확인 가능.) 이어 "반품" → RETURNED + 재고 복원.
  - "수주 등록" → 고객·품목·수량·납기 → 등록 → 목록 증가. 수주행 "출하요청" → 출하 생성.
  - viewer → 변경 403.
  Report ACTUAL. 종료 후 `npm run db:seed`, `npx kill-port 3001`, 스크래치 삭제.
- [ ] **Step 3** 이슈 수정 시 별도 커밋.

---

## Self-Review 결과
**Spec 커버리지:** FR-SAL-1(수주 등록·현황) → 수주 CRUD ✅ / FR-SAL-2(출하요청·등록·현황·반품) → shipment 요청/ship/return + 재고 반영 ✅. (수주→생산의뢰 자동 WO 생성은 선택; 본 범위는 수주 등록까지, WO 연계는 후속.) RBAC+audit ✅.
**플레이스홀더 스캔:** 없음(Task 3 상세 지침).
**타입 일관성:** SalesOrderStatus·ShipmentStatus(domain)·SalesOrderRow/ShipmentRow(service) 재사용. ship/return $transaction으로 재고 정합. 고객은 listSuppliers("CUSTOMER") 재사용.
**주의:** sales-service.test.ts 쓰기 테스트 afterAll 재seed. 출하=재고 OUT, 반품=재고 IN. server(force-dynamic)+client(POST/PATCH).
**범위:** R3-C(영업). 이후 R3-D(특채 QLT-4·모델/도면 MST-5~6)로 R3 마무리.
