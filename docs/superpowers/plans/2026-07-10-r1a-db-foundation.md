# R1-A DB 기반(Prisma+SQLite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** R1(MVP)의 데이터 계층을 세운다 — Prisma+SQLite 스키마(R1 엔티티), 초기 마이그레이션, 즉시 실행 가능한 seed, Prisma 클라이언트 싱글턴, 환경변수 검증, 그리고 순수 도메인 함수(현재고 파생·Lot 계보·BOM 전개)와 그 테스트.

**Architecture:** SRS §6 데이터 모델을 Prisma 스키마로 구현. SQLite는 Prisma enum 미지원이므로 상태/역할/유형은 String + TS 유니온 타입(도메인 계층)으로 관리. 재고는 테이블이 아니라 InventoryTxn append-only 집계로 파생(`deriveStock`). Prisma 클라이언트는 개발 중 중복 인스턴스를 막는 싱글턴(`lib/db.ts`). 필수 env(DATABASE_URL) 누락 시 즉시 실패(`lib/env.ts`). 도메인 로직(순수 함수)은 Prisma와 분리해 단위테스트.

**Tech Stack:** Prisma 5 + @prisma/client + SQLite, tsx(seed 실행), TS, Vitest.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `prisma/schema.prisma` | 데이터소스(sqlite)·제너레이터·R1 모델 |
| `prisma/seed.ts` | 즉시 실행 가능한 최소 데이터(사용자·품목·작업장·공정·Routing·계획·WO·초기 재고) |
| `prisma/migrations/**` | 초기 마이그레이션(자동 생성) |
| `.env.example` | `DATABASE_URL` 예시 |
| `.env.local` | 로컬 DB URL (커밋 안 함, gitignore) |
| `lib/env.ts` | 필수 env 검증(누락 시 throw) |
| `lib/db.ts` | Prisma 클라이언트 싱글턴 |
| `lib/domain/types.ts` | 도메인 유니온 타입(상태/역할/유형) |
| `lib/domain/stock.ts` | `deriveStock` (InventoryTxn → 품목별 현재고) |
| `lib/domain/stock.test.ts` | stock 테스트 |
| `lib/domain/genealogy.ts` | `ancestors`/`descendants` (LotGenealogy 그래프 탐색) |
| `lib/domain/genealogy.test.ts` | genealogy 테스트 |
| `lib/domain/bom.ts` | `explodeBom` (BOM 정전개) |
| `lib/domain/bom.test.ts` | bom 테스트 |
| `package.json` | prisma 스크립트(migrate/seed/reset) |

SRS §6.1 엔티티 중 R1 범위(MST-1~4, PRD-1~6, SEC-1~2)만: User, Item, BomComponent, WorkCenter, Equipment, ProcessStage, Routing, RoutingStep, ProductionPlan, WorkOrder, Lot, LotGenealogy, ProductionResult, InventoryTxn. (품질/설비보전/자재구매/영업/AuditLog/Alarm은 R2+.)

---

### Task 1: Prisma 설치 + 스키마 + env + db 클라이언트

**Files:** Create `prisma/schema.prisma`, `.env.example`, `lib/env.ts`, `lib/db.ts`; Modify `package.json`, `.gitignore`.

- [ ] **Step 1: 의존성 설치 (bash)**
```bash
npm install @prisma/client@5.17.0
npm install -D prisma@5.17.0 tsx@4.16.2
```
Expected: 설치 성공. 버전 실패 시 major 유지·근접 패치 허용, 보고.

- [ ] **Step 2: `.gitignore`에 DB/로컬env 추가** (없으면 append)
```
.env.local
prisma/dev.db
prisma/dev.db-journal
```
(`.env.local`은 이미 있을 수 있음 — 중복 무방. dev.db가 gitignore되는지 확인.)

- [ ] **Step 3: `.env.example`**
```
# SQLite 개발 DB (R1 기본). PostgreSQL 전환 시 provider/URL 교체.
DATABASE_URL="file:./dev.db"
# 세션 쿠키 서명 키 (R1-B 인증에서 사용). 운영에서는 강한 무작위 값.
SESSION_SECRET="dev-only-change-me"
```
그리고 로컬 실행용으로 `.env.local` 생성(커밋 안 됨):
```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="dev-only-change-me"
```
> Prisma는 기본적으로 `.env`를 읽는다. Next는 `.env.local`을 읽는다. 양쪽 도구가 같은 값을 보도록, 이 태스크에서 프로젝트 루트에 `.env`도 생성해 `DATABASE_URL`을 넣는다(단 `.env`는 gitignore에 추가해 커밋 금지). 즉 `.gitignore`에 `.env` 추가, `.env` 파일 생성(`DATABASE_URL="file:./dev.db"`), `.env.example`만 커밋.

- [ ] **Step 4: `lib/env.ts`**
```ts
/** 필수 환경변수 검증 — 누락 시 즉시 실패(앱 부팅 불가) */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`필수 환경변수 누락: ${name}. .env.example을 참고해 설정하세요.`);
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
};
```

- [ ] **Step 5: `lib/db.ts` (Prisma 싱글턴)**
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 6: `prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ── 인증/권한 (SEC) ──
// role: ADMIN | OPERATOR | VIEWER
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  name         String
  role         String   @default("VIEWER")
  createdAt    DateTime @default(now())
}

// ── 기준정보 (MST) ──
// type: FINISHED | SEMI | RAW | SUB
model Item {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  type        String
  uom         String   @default("EA")
  safetyStock Int      @default(0)
  createdAt   DateTime @default(now())

  bomParents  BomComponent[] @relation("BomParent")
  bomChildren BomComponent[] @relation("BomChild")
  routings    Routing[]
  plans       ProductionPlan[]
  workOrders  WorkOrder[]
  lots        Lot[]
  invTxns     InventoryTxn[]
}

// BOM 다단: parent 1 - N child (qtyPer)
model BomComponent {
  id       String @id @default(cuid())
  parentId String
  childId  String
  qtyPer   Float  @default(1)

  parent Item @relation("BomParent", fields: [parentId], references: [id])
  child  Item @relation("BomChild", fields: [childId], references: [id])

  @@unique([parentId, childId])
}

model WorkCenter {
  id         String       @id @default(cuid())
  code       String       @unique
  name       String
  equipment  Equipment[]
  routeSteps RoutingStep[]
  workOrders WorkOrder[]
}

model Equipment {
  id           String     @id @default(cuid())
  code         String     @unique
  name         String
  workCenterId String?
  workCenter   WorkCenter? @relation(fields: [workCenterId], references: [id])
}

model ProcessStage {
  id         String        @id @default(cuid())
  code       String        @unique
  name       String
  seq        Int           @default(0)
  routeSteps RoutingStep[]
}

model Routing {
  id     String        @id @default(cuid())
  itemId String
  name   String        @default("기본")
  item   Item          @relation(fields: [itemId], references: [id])
  steps  RoutingStep[]
}

model RoutingStep {
  id             String       @id @default(cuid())
  routingId      String
  processStageId String
  workCenterId   String?
  seq            Int
  stdTimeMin     Float        @default(0)

  routing      Routing      @relation(fields: [routingId], references: [id])
  processStage ProcessStage @relation(fields: [processStageId], references: [id])
  workCenter   WorkCenter?  @relation(fields: [workCenterId], references: [id])
}

// ── 생산 실행 (PRD) ──
model ProductionPlan {
  id         String      @id @default(cuid())
  code       String      @unique
  itemId     String
  qty        Int
  planDate   DateTime
  createdAt  DateTime    @default(now())
  item       Item        @relation(fields: [itemId], references: [id])
  workOrders WorkOrder[]
}

// status: WAITING | RUNNING | DONE | CANCELLED
model WorkOrder {
  id           String   @id @default(cuid())
  code         String   @unique
  planId       String?
  itemId       String
  qty          Int
  status       String   @default("WAITING")
  workCenterId String?
  createdAt    DateTime @default(now())

  plan       ProductionPlan?    @relation(fields: [planId], references: [id])
  item       Item               @relation(fields: [itemId], references: [id])
  workCenter WorkCenter?        @relation(fields: [workCenterId], references: [id])
  lots       Lot[]
  results    ProductionResult[]
}

// status: CREATED | IN_PROGRESS | INSPECTED | PASSED | FAILED | SHIPPED
model Lot {
  id          String   @id @default(cuid())
  code        String   @unique
  itemId      String
  workOrderId String?
  qty         Int      @default(0)
  status      String   @default("CREATED")
  createdAt   DateTime @default(now())

  item      Item       @relation(fields: [itemId], references: [id])
  workOrder WorkOrder? @relation(fields: [workOrderId], references: [id])
  invTxns   InventoryTxn[]

  // 계보(자기참조 N-N via LotGenealogy)
  parentLinks LotGenealogy[] @relation("ChildSide")
  childLinks  LotGenealogy[] @relation("ParentSide")
}

model LotGenealogy {
  id          String @id @default(cuid())
  parentLotId String
  childLotId  String

  parentLot Lot @relation("ParentSide", fields: [parentLotId], references: [id])
  childLot  Lot @relation("ChildSide", fields: [childLotId], references: [id])

  @@unique([parentLotId, childLotId])
}

model ProductionResult {
  id          String   @id @default(cuid())
  workOrderId String
  lotId       String?
  goodQty     Int      @default(0)
  defectQty   Int      @default(0)
  downtimeMin Int      @default(0)
  createdAt   DateTime @default(now())

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id])
}

// 재고 트랜잭션 append-only. 현재고 = 파생 집계(deriveStock).
// type: IN | OUT | MOVE | ADJUST | PRODUCE | CONSUME
model InventoryTxn {
  id        String   @id @default(cuid())
  itemId    String
  lotId     String?
  qty       Int      // 부호 포함(+입고/생산, -출고/소비)
  type      String
  ref       String?
  createdAt DateTime @default(now())

  item Item @relation(fields: [itemId], references: [id])
  lot  Lot? @relation(fields: [lotId], references: [id])
}
```

- [ ] **Step 7: `package.json` 스크립트 추가**
`scripts`에 추가:
```json
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force",
    "db:studio": "prisma studio"
```
그리고 최상위에 prisma seed 설정 추가:
```json
  "prisma": { "seed": "tsx prisma/seed.ts" }
```

- [ ] **Step 8: 검증**
Run `npx prisma format` (스키마 유효성 — 성공/포맷). Run `npx prisma validate` (스키마 유효). Run `npx tsc --noEmit` (lib/env.ts, lib/db.ts 타입 — 단, @prisma/client 타입은 generate 후 생성되므로 이 태스크에서는 `npx prisma generate` 먼저 실행 후 tsc). 순서: `npx prisma generate` → `npx tsc --noEmit`.

- [ ] **Step 9: Commit**
```bash
git add prisma/schema.prisma .env.example lib/env.ts lib/db.ts package.json package-lock.json .gitignore
git commit -m "feat(r1): Prisma+SQLite 스키마(R1 엔티티) + env 검증 + db 싱글턴"
```
(`.env`, `.env.local`, `prisma/dev.db`는 gitignore되어 커밋되지 않음을 확인.)

---

### Task 2: 초기 마이그레이션

**Files:** Create `prisma/migrations/**` (자동 생성).

- [ ] **Step 1: 마이그레이션 생성 + 적용**
Run: `npx prisma migrate dev --name init`
Expected: `prisma/migrations/<ts>_init/migration.sql` 생성, dev.db에 테이블 생성, 클라이언트 재생성. 오류 0.
(비대화형에서 `migrate dev`가 이름을 물으면 `--name init`으로 해소됨. env는 `.env`에서 로드.)

- [ ] **Step 2: 검증**
Run `npx prisma validate` (성공). 마이그레이션 SQL이 생성됐는지 `ls prisma/migrations` 확인.

- [ ] **Step 3: Commit**
```bash
git add prisma/migrations
git commit -m "feat(r1): 초기 마이그레이션(init)"
```

---

### Task 3: 도메인 순수 함수 + 테스트 (TDD)

**Files:** Create `lib/domain/types.ts`, `lib/domain/stock.ts`(+test), `lib/domain/genealogy.ts`(+test), `lib/domain/bom.ts`(+test).

- [ ] **Step 1: `lib/domain/types.ts`**
```ts
export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";
export type ItemType = "FINISHED" | "SEMI" | "RAW" | "SUB";
export type WorkOrderStatus = "WAITING" | "RUNNING" | "DONE" | "CANCELLED";
export type LotStatus = "CREATED" | "IN_PROGRESS" | "INSPECTED" | "PASSED" | "FAILED" | "SHIPPED";
export type InventoryTxnType = "IN" | "OUT" | "MOVE" | "ADJUST" | "PRODUCE" | "CONSUME";
```

- [ ] **Step 2: 실패 테스트 `lib/domain/stock.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { deriveStock } from "@/lib/domain/stock";

describe("deriveStock", () => {
  it("품목별로 트랜잭션 수량을 합산한다", () => {
    const txns = [
      { itemId: "A", qty: 100 },
      { itemId: "A", qty: -30 },
      { itemId: "B", qty: 50 },
    ];
    const stock = deriveStock(txns);
    expect(stock.get("A")).toBe(70);
    expect(stock.get("B")).toBe(50);
  });
  it("트랜잭션이 없으면 빈 맵", () => {
    expect(deriveStock([]).size).toBe(0);
  });
  it("음수 재고도 그대로 반영한다", () => {
    expect(deriveStock([{ itemId: "X", qty: -12 }]).get("X")).toBe(-12);
  });
});
```
Run → FAIL.

- [ ] **Step 3: `lib/domain/stock.ts`**
```ts
export interface StockTxn {
  itemId: string;
  qty: number;
}

/** InventoryTxn 목록 → 품목별 현재고(파생 집계) */
export function deriveStock(txns: StockTxn[]): Map<string, number> {
  const acc = new Map<string, number>();
  for (const t of txns) acc.set(t.itemId, (acc.get(t.itemId) ?? 0) + t.qty);
  return acc;
}
```
Run → PASS (3).

- [ ] **Step 4: 실패 테스트 `lib/domain/genealogy.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { ancestors, descendants } from "@/lib/domain/genealogy";

// 링크: parent → child
const links = [
  { parentLotId: "R1", childLotId: "S1" },
  { parentLotId: "R2", childLotId: "S1" },
  { parentLotId: "S1", childLotId: "P1" },
];

describe("genealogy", () => {
  it("descendants는 후손을 모은다", () => {
    expect(descendants("R1", links).sort()).toEqual(["P1", "S1"]);
  });
  it("ancestors는 조상을 모은다", () => {
    expect(ancestors("P1", links).sort()).toEqual(["R1", "R2", "S1"]);
  });
  it("말단은 빈 배열", () => {
    expect(descendants("P1", links)).toEqual([]);
    expect(ancestors("R1", links)).toEqual([]);
  });
});
```
Run → FAIL.

- [ ] **Step 5: `lib/domain/genealogy.ts`**
```ts
export interface GenLink {
  parentLotId: string;
  childLotId: string;
}

/** lotId의 모든 후손 lotId (중복 제거, 자신 제외) */
export function descendants(lotId: string, links: GenLink[]): string[] {
  const out = new Set<string>();
  const walk = (id: string) => {
    for (const l of links) {
      if (l.parentLotId === id && !out.has(l.childLotId)) {
        out.add(l.childLotId);
        walk(l.childLotId);
      }
    }
  };
  walk(lotId);
  return [...out];
}

/** lotId의 모든 조상 lotId (중복 제거, 자신 제외) */
export function ancestors(lotId: string, links: GenLink[]): string[] {
  const out = new Set<string>();
  const walk = (id: string) => {
    for (const l of links) {
      if (l.childLotId === id && !out.has(l.parentLotId)) {
        out.add(l.parentLotId);
        walk(l.parentLotId);
      }
    }
  };
  walk(lotId);
  return [...out];
}
```
Run → PASS (3).

- [ ] **Step 6: 실패 테스트 `lib/domain/bom.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { explodeBom } from "@/lib/domain/bom";

// P1 = 2×S1 + 1×R2; S1 = 3×R1
const bom = [
  { parentId: "P1", childId: "S1", qtyPer: 2 },
  { parentId: "P1", childId: "R2", qtyPer: 1 },
  { parentId: "S1", childId: "R1", qtyPer: 3 },
];

describe("explodeBom", () => {
  it("다단 소요량을 전개한다(수량 곱)", () => {
    const req = explodeBom("P1", 10, bom);
    expect(req.get("S1")).toBe(20);
    expect(req.get("R2")).toBe(10);
    expect(req.get("R1")).toBe(60); // 10×2×3
  });
  it("BOM 없는 품목은 빈 맵", () => {
    expect(explodeBom("R1", 5, bom).size).toBe(0);
  });
});
```
Run → FAIL.

- [ ] **Step 7: `lib/domain/bom.ts`**
```ts
export interface BomLink {
  parentId: string;
  childId: string;
  qtyPer: number;
}

/** parent 품목 qty 생산에 필요한 하위 품목 소요량(다단 전개) */
export function explodeBom(itemId: string, qty: number, bom: BomLink[]): Map<string, number> {
  const req = new Map<string, number>();
  const walk = (id: string, mult: number) => {
    for (const l of bom) {
      if (l.parentId === id) {
        const need = l.qtyPer * mult;
        req.set(l.childId, (req.get(l.childId) ?? 0) + need);
        walk(l.childId, need);
      }
    }
  };
  walk(itemId, qty);
  return req;
}
```
Run → PASS (2).

- [ ] **Step 8: 전체 도메인 테스트 확인** — Run `npm test -- lib/domain` → 8 passed(stock 3 + genealogy 3 + bom 2).

- [ ] **Step 9: Commit**
```bash
git add lib/domain
git commit -m "feat(r1): 도메인 순수함수(deriveStock·genealogy·explodeBom) + 테스트"
```

---

### Task 4: seed 스크립트 + 실행

**Files:** Create `prisma/seed.ts`.

- [ ] **Step 1: `prisma/seed.ts`**
```ts
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// R1-B에서 정식 해시로 교체. 지금은 결정적 sha256(데모용).
function hash(pw: string): string {
  return createHash("sha256").update(pw).digest("hex");
}

async function main() {
  // 멱등: 기존 데이터 정리(개발 seed)
  await prisma.inventoryTxn.deleteMany();
  await prisma.lotGenealogy.deleteMany();
  await prisma.productionResult.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.routingStep.deleteMany();
  await prisma.routing.deleteMany();
  await prisma.bomComponent.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.processStage.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  // 사용자(RBAC)
  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: hash("admin123"), name: "관리자", role: "ADMIN" },
      { username: "operator", passwordHash: hash("oper123"), name: "김현장", role: "OPERATOR" },
      { username: "viewer", passwordHash: hash("view123"), name: "이조회", role: "VIEWER" },
    ],
  });

  // 품목
  const raw1 = await prisma.item.create({ data: { code: "RM-SUS304", name: "환봉 SUS-304 Ø50", type: "RAW", uom: "kg", safetyStock: 250 } });
  const raw2 = await prisma.item.create({ data: { code: "RM-AL6061", name: "알루미늄 6061", type: "RAW", uom: "kg", safetyStock: 100 } });
  const semi = await prisma.item.create({ data: { code: "SF-SHAFT", name: "샤프트 SUS-304", type: "SEMI", uom: "EA", safetyStock: 50 } });
  const fin = await prisma.item.create({ data: { code: "FG-GB2500", name: "기어박스 GB-2500", type: "FINISHED", uom: "EA", safetyStock: 50 } });

  // BOM: 완제품 = 2×반제품; 반제품 = 3kg 원자재
  await prisma.bomComponent.createMany({
    data: [
      { parentId: fin.id, childId: semi.id, qtyPer: 2 },
      { parentId: semi.id, childId: raw1.id, qtyPer: 3 },
    ],
  });

  // 작업장·설비·공정
  const wcCnc = await prisma.workCenter.create({ data: { code: "WC-CNC1", name: "CNC 1라인" } });
  const wcAsm = await prisma.workCenter.create({ data: { code: "WC-ASM1", name: "조립 1라인" } });
  await prisma.equipment.createMany({
    data: [
      { code: "EQ-CNC-03", name: "CNC-03", workCenterId: wcCnc.id },
      { code: "EQ-ASM-01", name: "조립기-01", workCenterId: wcAsm.id },
    ],
  });
  const psCut = await prisma.processStage.create({ data: { code: "PS-CUT", name: "절단", seq: 1 } });
  const psMac = await prisma.processStage.create({ data: { code: "PS-MAC", name: "가공", seq: 2 } });
  const psAsm = await prisma.processStage.create({ data: { code: "PS-ASM", name: "조립", seq: 3 } });

  // Routing (완제품)
  const routing = await prisma.routing.create({ data: { itemId: fin.id, name: "기본" } });
  await prisma.routingStep.createMany({
    data: [
      { routingId: routing.id, processStageId: psCut.id, workCenterId: wcCnc.id, seq: 1, stdTimeMin: 5 },
      { routingId: routing.id, processStageId: psMac.id, workCenterId: wcCnc.id, seq: 2, stdTimeMin: 12 },
      { routingId: routing.id, processStageId: psAsm.id, workCenterId: wcAsm.id, seq: 3, stdTimeMin: 8 },
    ],
  });

  // 생산계획 + 작업지시 + Lot
  const plan = await prisma.productionPlan.create({ data: { code: "PP-2607-001", itemId: fin.id, qty: 300, planDate: new Date("2026-07-14") } });
  const wo = await prisma.workOrder.create({ data: { code: "WO-260709-011", planId: plan.id, itemId: fin.id, qty: 300, status: "WAITING", workCenterId: wcAsm.id } });
  const lotRaw = await prisma.lot.create({ data: { code: "LOT-2600701", itemId: raw1.id, qty: 1200, status: "PASSED" } });
  const lotSemi = await prisma.lot.create({ data: { code: "LOT-2600712", itemId: semi.id, workOrderId: wo.id, qty: 450, status: "IN_PROGRESS" } });
  await prisma.lotGenealogy.create({ data: { parentLotId: lotRaw.id, childLotId: lotSemi.id } });

  // 초기 재고 트랜잭션(append-only)
  await prisma.inventoryTxn.createMany({
    data: [
      { itemId: raw1.id, lotId: lotRaw.id, qty: 1200, type: "IN", ref: "GR-INIT" },
      { itemId: raw1.id, qty: -1020, type: "CONSUME", ref: "WO-260709-011" }, // 현재고 180 → 안전재고 미달
      { itemId: raw2.id, qty: 300, type: "IN", ref: "GR-INIT" },
      { itemId: semi.id, lotId: lotSemi.id, qty: 450, type: "PRODUCE", ref: "WO-260709-011" },
      { itemId: fin.id, qty: 120, type: "PRODUCE", ref: "WO-PREV" },
    ],
  });

  console.log("seed 완료: 사용자 3, 품목 4, 작업장 2, 공정 3, Routing 1, 계획 1, WO 1, Lot 2, 재고txn 5");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: seed 실행**
Run: `npm run db:seed`
Expected: "seed 완료: ..." 출력, 오류 0.

- [ ] **Step 3: 데이터 확인 (비대화형 스크립트)**
Run: `npx tsx -e "import{PrismaClient}from'@prisma/client';const p=new PrismaClient();p.item.count().then(c=>{console.log('items',c);return p.$disconnect();})"`
Expected: `items 4`. (또는 `npx prisma studio`는 대화형이므로 실행하지 말 것.)

- [ ] **Step 4: Commit**
```bash
git add prisma/seed.ts
git commit -m "feat(r1): 즉시 실행 가능한 seed(사용자·품목·BOM·Routing·WO·Lot·재고)"
```

---

### Task 5: 전체 검증

- [ ] **Step 1: 게이트**
Run `npm test` → 도메인 8 포함 전체 통과(기존 52 + 8 = 60 passed). Run `npx tsc --noEmit` (클린). Run `npm run build` (Next 빌드 성공 — Prisma 클라이언트 import가 빌드에 문제없는지 확인).

- [ ] **Step 2: 스모크 — 파생 현재고 확인**
Run: `npx tsx -e "import{PrismaClient}from'@prisma/client';import{deriveStock}from'./lib/domain/stock';const p=new PrismaClient();p.inventoryTxn.findMany().then(t=>{const s=deriveStock(t);console.log('SUS304 stock', [...s.entries()]);return p.$disconnect();})"`
Expected: 품목별 현재고 출력(원자재 SUS304 = 1200-1020 = 180 등). 안전재고 미달 데이터가 의도대로 존재.

- [ ] **Step 3: Commit** (검증만이면 커밋 없음)

---

## Self-Review 결과

**Spec 커버리지 (SRS §6 데이터 + R1 범위):**
- R1 엔티티(User·Item·BomComponent·WorkCenter·Equipment·ProcessStage·Routing·RoutingStep·ProductionPlan·WorkOrder·Lot·LotGenealogy·ProductionResult·InventoryTxn) → Task 1 스키마 ✅
- 마이그레이션 → Task 2 ✅ / seed(즉시 실행 최소 데이터) → Task 4 ✅
- 데이터 규칙: 코드 유일성(@unique), Lot 상태 문자열, 재고 append-only+파생(deriveStock) → Task 1·3 ✅
- 환경변수: .env.example 제공, 누락 시 즉시 실패(lib/env.ts) → Task 1 ✅
- 도메인 순수함수 단위테스트(NFR-MNT-1 계층분리) → Task 3 ✅

**플레이스홀더 스캔:** 없음.

**타입 일관성:** 도메인 유니온 타입(types.ts)이 스키마 String 필드의 허용값과 일치. deriveStock/ancestors/descendants/explodeBom 시그니처가 테스트와 구현 동일.

**주의:** SQLite는 Prisma enum 미지원 → 상태/역할/유형은 String. Prisma 클라이언트 타입은 `prisma generate` 후 생성되므로 tsc/테스트 전 generate 필수(Task 1 Step 8, Task 2에서 자동). `.env`/`.env.local`/`prisma/dev.db`는 gitignore.

**범위:** R1-A(DB 기반)만. 이후 R1-B 인증/RBAC → R1-C API(route/service/domain) → R1-D 목업 화면 실데이터 연동.
