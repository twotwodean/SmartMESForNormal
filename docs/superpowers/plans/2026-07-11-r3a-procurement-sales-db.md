# R3-A 자재구매·영업·특채·모델 DB 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** R3 데이터 계층 — 거래처, 구매(발주·입고), 영업(수주·출하), 특채, 모델/문서 스키마 + 마이그레이션 + seed + 도메인 헬퍼(입고 진척률).

**Architecture:** R1/R2 스키마에 R3 엔티티 추가(String enum 유지). 도메인 `receiptProgress` 순수함수(테스트). seed에 거래처·발주·입고·수주·출하·특채·모델 최소 데이터.

**Tech Stack:** Prisma+SQLite, TS, Vitest.

---

## File Structure
| 파일 | 책임 |
|---|---|
| `prisma/schema.prisma` | (수정) Supplier·PurchaseOrder·GoodsReceipt·SalesOrder·Shipment·Concession·ProductModel·DocumentRev 추가 |
| `prisma/migrations/**` | 마이그레이션(add-r3) |
| `prisma/seed.ts` | (수정) R3 데이터 추가 |
| `lib/domain/procurement.ts` (+test) | `receiptProgress(ordered, received)` |
| `lib/domain/types.ts` | (수정) R3 유니온 타입 |

SRS §6.1(PurchaseOrder·GoodsReceipt·SalesOrder·Shipment 등), FR-MAT-2, FR-SAL-1~2, FR-QLT-4, FR-MST-5~6.

---

### Task 1: 스키마 확장 + 마이그레이션

- [ ] **Step 1: `prisma/schema.prisma` 모델 추가** (기존 유지)
기존 `Item` 모델에 역참조 추가: `purchaseOrders PurchaseOrder[]`, `goodsReceipts GoodsReceipt[]`, `salesOrders SalesOrder[]`, `shipments Shipment[]`, `concessions Concession[]`, `models ProductModel[]`, `documents DocumentRev[]`.

추가 모델:
```prisma
// type: SUPPLIER | CUSTOMER
model Supplier {
  id             String          @id @default(cuid())
  code           String          @unique
  name           String
  type           String          @default("SUPPLIER")
  purchaseOrders PurchaseOrder[]
  salesOrders    SalesOrder[]
}

// status: ORDERED | PARTIAL | RECEIVED | CANCELLED
model PurchaseOrder {
  id          String         @id @default(cuid())
  code        String         @unique
  supplierId  String
  itemId      String
  qty         Int
  status      String         @default("ORDERED")
  orderedAt   DateTime       @default(now())
  supplier    Supplier       @relation(fields: [supplierId], references: [id])
  item        Item           @relation(fields: [itemId], references: [id])
  receipts    GoodsReceipt[]
}

model GoodsReceipt {
  id              String         @id @default(cuid())
  code            String         @unique
  purchaseOrderId String?
  itemId          String
  qty             Int
  receivedAt      DateTime       @default(now())
  purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  item            Item           @relation(fields: [itemId], references: [id])
}

// status: ORDERED | PRODUCING | SHIPPED | CANCELLED
model SalesOrder {
  id         String     @id @default(cuid())
  code       String     @unique
  customerId String
  itemId     String
  qty        Int
  status     String     @default("ORDERED")
  dueDate    DateTime
  createdAt  DateTime   @default(now())
  customer   Supplier   @relation(fields: [customerId], references: [id])
  item       Item       @relation(fields: [itemId], references: [id])
  shipments  Shipment[]
}

// status: REQUESTED | SHIPPED | RETURNED
model Shipment {
  id           String      @id @default(cuid())
  code         String      @unique
  salesOrderId String?
  itemId       String
  qty          Int
  status       String      @default("REQUESTED")
  shippedAt    DateTime?
  createdAt    DateTime    @default(now())
  salesOrder   SalesOrder? @relation(fields: [salesOrderId], references: [id])
  item         Item        @relation(fields: [itemId], references: [id])
}

// status: REQUESTED | APPROVED | REJECTED
model Concession {
  id          String    @id @default(cuid())
  itemId      String
  qty         Int
  reason      String
  status      String    @default("REQUESTED")
  requestedAt DateTime  @default(now())
  decidedAt   DateTime?
  item        Item      @relation(fields: [itemId], references: [id])
}

model ProductModel {
  id     String @id @default(cuid())
  itemId String
  code   String @unique
  name   String
  spec   String?
  item   Item   @relation(fields: [itemId], references: [id])
}

model DocumentRev {
  id        String   @id @default(cuid())
  itemId    String?
  name      String
  rev       String   @default("A")
  note      String?
  createdAt DateTime @default(now())
  item      Item?    @relation(fields: [itemId], references: [id])
}
```

- [ ] **Step 2: 마이그레이션** — `npx prisma format` → `npx prisma validate` → `npx prisma migrate dev --name add-r3` → `npx prisma generate`. (seed 자동 실행이 현 seed로 통과하는지 확인; 마이그레이션 성공 확인.)

- [ ] **Step 3: 검증 + Commit** — `npx tsc --noEmit` 클린. dev.db gitignore 확인.
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(r3): 스키마 확장(거래처·발주·입고·수주·출하·특채·모델·문서) + 마이그레이션"
```

---

### Task 2: 도메인 + 타입

- [ ] **Step 1: `lib/domain/types.ts`에 추가**
```ts
export type SupplierType = "SUPPLIER" | "CUSTOMER";
export type PurchaseOrderStatus = "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
export type SalesOrderStatus = "ORDERED" | "PRODUCING" | "SHIPPED" | "CANCELLED";
export type ShipmentStatus = "REQUESTED" | "SHIPPED" | "RETURNED";
export type ConcessionStatus = "REQUESTED" | "APPROVED" | "REJECTED";
```

- [ ] **Step 2: 실패 테스트 `lib/domain/procurement.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { receiptProgress, poStatusFor } from "@/lib/domain/procurement";

describe("receiptProgress", () => {
  it("입고/발주 비율(%)", () => {
    expect(receiptProgress(100, 0)).toBe(0);
    expect(receiptProgress(100, 40)).toBe(40);
    expect(receiptProgress(100, 100)).toBe(100);
  });
  it("발주 0이면 0", () => {
    expect(receiptProgress(0, 0)).toBe(0);
  });
  it("초과 입고는 100으로 캡", () => {
    expect(receiptProgress(100, 130)).toBe(100);
  });
});

describe("poStatusFor", () => {
  it("입고량에 따라 상태", () => {
    expect(poStatusFor(100, 0)).toBe("ORDERED");
    expect(poStatusFor(100, 40)).toBe("PARTIAL");
    expect(poStatusFor(100, 100)).toBe("RECEIVED");
    expect(poStatusFor(100, 120)).toBe("RECEIVED");
  });
});
```
Run → FAIL. `lib/domain/procurement.ts`:
```ts
import type { PurchaseOrderStatus } from "@/lib/domain/types";

/** 입고 진척률(%) = 입고/발주 ×100, 0~100 캡, 발주 0이면 0 */
export function receiptProgress(ordered: number, received: number): number {
  if (ordered <= 0) return 0;
  return Math.min(100, Math.round((received / ordered) * 100));
}

/** 입고량 기준 발주 상태 */
export function poStatusFor(ordered: number, received: number): PurchaseOrderStatus {
  if (received <= 0) return "ORDERED";
  if (received >= ordered) return "RECEIVED";
  return "PARTIAL";
}
```
Run → PASS (5).

- [ ] **Step 3: 확인 + Commit** — `npm test -- lib/domain/procurement.test.ts` PASS, `npx tsc --noEmit` 클린.
```bash
git add lib/domain/procurement.ts lib/domain/procurement.test.ts lib/domain/types.ts
git commit -m "feat(r3): 구매 도메인(receiptProgress·poStatusFor) + R3 타입 + 테스트"
```

---

### Task 3: seed R3 데이터

- [ ] **Step 1: seed 확장** — 정리 블록 상단에 추가(FK 순서): `documentRev, productModel, concession, shipment, salesOrder, goodsReceipt, purchaseOrder, supplier` deleteMany를 기존 정리보다 먼저. 생성부 끝에 추가:
  - Supplier 2 (SUP-001 대성금속 SUPPLIER, CUS-001 한빛기계 CUSTOMER).
  - PurchaseOrder 2 (원자재 raw1/raw2 발주; PO-2607-001 SUS304 500 ORDERED, PO-2607-002 AL6061 300 PARTIAL) — supplier SUP-001.
  - GoodsReceipt 1 (PO-2607-002 부분입고 200; itemId raw2) — 관련 재고txn은 R3-B 입고 처리에서, seed에선 GR 레코드만.
  - SalesOrder 1 (customer CUS-001, 완제품 fin 200, dueDate, ORDERED).
  - Shipment 1 (SO 연결, 완제품 120, REQUESTED).
  - Concession 1 (fin, qty 5, reason "치수 경미 초과", REQUESTED).
  - ProductModel 1 (fin, PM-GB2500-A "GB-2500 표준형", spec "비율 1:25").
  - DocumentRev 1 (fin, "GB-2500 조립도", rev "B").
  변수 참조(raw1/raw2/fin) 기존 seed에서 확인. 콘솔 요약 갱신.

- [ ] **Step 2: 재시드 + 확인** — `npm run db:seed` 성공. `npx tsx -e "...count purchaseOrder,salesOrder,shipment,concession,supplier..."` → 0보다 큰 값 보고.

- [ ] **Step 3: Commit**
```bash
git add prisma/seed.ts
git commit -m "feat(r3): seed에 거래처·발주·입고·수주·출하·특채·모델 데이터 추가"
```

---

### Task 4: 전체 검증
- [ ] `npm run db:seed` → `npm test`(procurement 5 포함 통과, 카운트) → `npx tsc --noEmit` → `npm run build`. 스모크로 receiptProgress를 seed PO에 적용해 출력.

---

## Self-Review 결과
**Spec 커버리지:** R3 엔티티(Supplier·PO·GR·SO·Shipment·Concession·ProductModel·DocumentRev) → Task 1 ✅. receiptProgress/poStatusFor + 타입 → Task 2 ✅. seed → Task 3 ✅.
**플레이스홀더 스캔:** 없음.
**타입 일관성:** R3 유니온(types.ts)이 스키마 String과 일치. poStatusFor 반환이 PurchaseOrderStatus.
**주의:** SQLite String enum. 역참조 양방향. dev.db gitignore. GR의 재고 반영은 R3-B 서비스에서(입고 처리 시 InventoryTxn IN 생성).
**범위:** R3-A(DB). 이후 R3-B(구매) → R3-C(영업) → R3-D(특채·모델/도면).
