# R2-A 품질·설비 DB 확장 + 도메인 계산 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** R2(품질·설비·OEE·알람) 데이터 계층을 세운다 — Prisma 스키마 확장(검사·부적합·불량코드·설비정비·예방점검·알람·감사로그), 마이그레이션, seed 추가, 그리고 순수 도메인 계산(PPM·MTTR·MTBF·OEE) + 테스트.

**Architecture:** R1 스키마에 R2 엔티티 추가(모두 String enum 대체 유지, SQLite). 지표는 순수 함수로 분리해 단위테스트(ppm·mttr·mtbf·oee). seed에 검사·불량코드·정비이력·알람 최소 데이터 추가(대시보드 R2 지표가 실데이터로 뜨도록).

**Tech Stack:** Prisma+SQLite, TS, Vitest.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `prisma/schema.prisma` | (수정) 모델 추가: DefectCode, Inspection, Nonconformance, MaintenanceOrder, MaintenanceSchedule, Alarm, AuditLog |
| `prisma/migrations/**` | 마이그레이션(add-r2) |
| `prisma/seed.ts` | (수정) 불량코드·검사·정비·알람 seed 추가 |
| `lib/domain/quality.ts` (+test) | `ppm(defect,total)` |
| `lib/domain/maintenance.ts` (+test) | `mttr(orders)`·`mtbf(orders, periodHours)` |
| `lib/domain/oee.ts` (+test) | `oee({...})` → availability·performance·quality·oee |
| `lib/domain/types.ts` | (수정) R2 유니온 타입 추가 |

SRS §6.1(Inspection·Nonconformance·MaintenanceOrder/Schedule·Alarm·AuditLog), FR-QLT-1~3, FR-EQP-1~3, PRD-7(OEE), DSH-2~4, SEC-3.

---

### Task 1: 스키마 확장 + 마이그레이션

**Files:** Modify `prisma/schema.prisma`; add migration.

- [ ] **Step 1: `prisma/schema.prisma`에 모델 추가** (기존 모델 유지, 아래를 파일 끝에 추가하고 필요한 역참조 관계는 기존 모델에 추가)

기존 `Item` 모델에 역참조 추가: `inspections Inspection[]`.
기존 `Equipment` 모델에 역참조 추가: `maintenanceOrders MaintenanceOrder[]` 와 `maintenanceSchedules MaintenanceSchedule[]`.
기존 `Lot` 모델에 역참조 추가: `inspections Inspection[]`.
기존 `WorkOrder` 모델에 역참조 추가: `inspections Inspection[]`.
기존 `User` 모델에 역참조 추가: `auditLogs AuditLog[]`.

추가 모델:
```prisma
model DefectCode {
  id             String          @id @default(cuid())
  code           String          @unique
  label          String
  nonconformances Nonconformance[]
}

// type: RECEIVING | PROCESS | SHIPPING
// result: PASS | FAIL | SPECIAL
model Inspection {
  id          String   @id @default(cuid())
  type        String
  result      String
  itemId      String
  lotId       String?
  workOrderId String?
  qty         Int      @default(0)
  defectQty   Int      @default(0)
  inspectedAt DateTime @default(now())

  item      Item       @relation(fields: [itemId], references: [id])
  lot       Lot?       @relation(fields: [lotId], references: [id])
  workOrder WorkOrder? @relation(fields: [workOrderId], references: [id])
  nonconformances Nonconformance[]
}

// status: OPEN | ACTION | CLOSED
model Nonconformance {
  id           String   @id @default(cuid())
  inspectionId String?
  defectCodeId String?
  qty          Int      @default(0)
  action       String?
  status       String   @default("OPEN")
  createdAt    DateTime @default(now())

  inspection Inspection? @relation(fields: [inspectionId], references: [id])
  defectCode DefectCode? @relation(fields: [defectCodeId], references: [id])
}

// type: REPAIR | PREVENTIVE
// status: REQUESTED | IN_PROGRESS | DONE
model MaintenanceOrder {
  id          String    @id @default(cuid())
  equipmentId String
  type        String
  status      String    @default("REQUESTED")
  description String?
  requestedAt DateTime  @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?

  equipment Equipment @relation(fields: [equipmentId], references: [id])
}

model MaintenanceSchedule {
  id           String   @id @default(cuid())
  equipmentId  String
  intervalDays Int
  nextDate     DateTime
  equipment    Equipment @relation(fields: [equipmentId], references: [id])
}

// tone: crit | warn | info
model Alarm {
  id         String    @id @default(cuid())
  tone       String
  title      String
  message    String?
  createdAt  DateTime  @default(now())
  resolvedAt DateTime?
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  entity    String
  entityId  String?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 2: 마이그레이션**
Run: `npx prisma migrate dev --name add-r2` (seed 자동 실행될 수 있음 — seed는 Task 2에서 갱신하나, 현재 seed도 동작하므로 통과. 만약 seed 단계 실패해도 마이그레이션 자체가 성공했는지 확인). 이어서 `npx prisma generate`.
Expected: 새 마이그레이션 폴더 생성, dev.db에 테이블 추가. `npx prisma validate` 통과.

- [ ] **Step 3: 검증 + Commit**
`npx tsc --noEmit`(클린 — 생성된 클라이언트 반영). 
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(r2): 스키마 확장(검사·부적합·불량코드·설비정비·예방점검·알람·감사로그) + 마이그레이션"
```
(dev.db는 gitignore.)

---

### Task 2: 도메인 계산(PPM·MTTR·MTBF·OEE) + 테스트 (TDD)

**Files:** Modify `lib/domain/types.ts`; create `lib/domain/quality.ts`(+test), `maintenance.ts`(+test), `oee.ts`(+test).

- [ ] **Step 1: `lib/domain/types.ts`에 추가**
```ts
export type InspectionType = "RECEIVING" | "PROCESS" | "SHIPPING";
export type InspectionResult = "PASS" | "FAIL" | "SPECIAL";
export type NonconformanceStatus = "OPEN" | "ACTION" | "CLOSED";
export type MaintenanceType = "REPAIR" | "PREVENTIVE";
export type MaintenanceStatus = "REQUESTED" | "IN_PROGRESS" | "DONE";
export type AlarmTone = "crit" | "warn" | "info";
```

- [ ] **Step 2: 실패 테스트 `lib/domain/quality.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { ppm } from "@/lib/domain/quality";

describe("ppm", () => {
  it("불량률을 백만분율로 계산한다", () => {
    expect(ppm(3, 1000)).toBe(3000);
    expect(ppm(1, 1_000_000)).toBe(1);
  });
  it("총수량 0이면 0", () => {
    expect(ppm(5, 0)).toBe(0);
  });
  it("반올림한다", () => {
    expect(ppm(1, 3)).toBe(333333);
  });
});
```
Run → FAIL. `lib/domain/quality.ts`:
```ts
/** 불량 PPM = 불량수/총수 × 1,000,000 (총수 0이면 0, 반올림) */
export function ppm(defectQty: number, totalQty: number): number {
  if (totalQty <= 0) return 0;
  return Math.round((defectQty / totalQty) * 1_000_000);
}
```
Run → PASS (3).

- [ ] **Step 3: 실패 테스트 `lib/domain/maintenance.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { mttr, mtbf } from "@/lib/domain/maintenance";

// 수리시간(분): (finished-started)
const orders = [
  { startedAt: 0, finishedAt: 60 },       // 60분
  { startedAt: 100, finishedAt: 140 },    // 40분
  { startedAt: 200, finishedAt: null },   // 진행중(제외)
];

describe("mttr/mtbf", () => {
  it("mttr는 완료 수리의 평균 수리시간(분)", () => {
    expect(mttr(orders)).toBe(50); // (60+40)/2
  });
  it("완료 수리가 없으면 mttr 0", () => {
    expect(mttr([{ startedAt: 0, finishedAt: null }])).toBe(0);
  });
  it("mtbf는 가동시간/고장횟수", () => {
    // periodMin 1000분, 고장 2건 → 500
    expect(mtbf(2, 1000)).toBe(500);
  });
  it("고장 0이면 mtbf는 전체 기간", () => {
    expect(mtbf(0, 1000)).toBe(1000);
  });
});
```
Run → FAIL. `lib/domain/maintenance.ts`:
```ts
export interface RepairSpan {
  startedAt: number | null;
  finishedAt: number | null;
}

/** 평균 수리시간(완료된 수리의 finished-started 평균). 완료 없으면 0 */
export function mttr(orders: RepairSpan[]): number {
  const spans = orders
    .filter((o) => o.startedAt !== null && o.finishedAt !== null)
    .map((o) => (o.finishedAt as number) - (o.startedAt as number));
  if (spans.length === 0) return 0;
  return Math.round(spans.reduce((a, b) => a + b, 0) / spans.length);
}

/** 평균 고장간격 = 기간/고장횟수. 고장 0이면 기간 전체 */
export function mtbf(failures: number, periodMin: number): number {
  if (failures <= 0) return periodMin;
  return Math.round(periodMin / failures);
}
```
Run → PASS (4).

- [ ] **Step 4: 실패 테스트 `lib/domain/oee.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { oee } from "@/lib/domain/oee";

describe("oee", () => {
  it("가용성×성능×품질을 계산한다", () => {
    // planned 480, downtime 80 → 가동 400 → availability 400/480
    // idealCycle 1분, totalCount 380 → performance (380×1)/400
    // good 361 → quality 361/380
    const r = oee({ plannedMin: 480, downtimeMin: 80, idealCycleMin: 1, totalCount: 380, goodCount: 361 });
    expect(r.availability).toBeCloseTo(400 / 480, 4);
    expect(r.performance).toBeCloseTo(380 / 400, 4);
    expect(r.quality).toBeCloseTo(361 / 380, 4);
    expect(r.oee).toBeCloseTo((400 / 480) * (380 / 400) * (361 / 380), 4);
  });
  it("계획시간 0이면 모두 0", () => {
    const r = oee({ plannedMin: 0, downtimeMin: 0, idealCycleMin: 1, totalCount: 0, goodCount: 0 });
    expect(r.oee).toBe(0);
  });
});
```
Run → FAIL. `lib/domain/oee.ts`:
```ts
export interface OeeInput {
  plannedMin: number;
  downtimeMin: number;
  idealCycleMin: number;
  totalCount: number;
  goodCount: number;
}
export interface OeeResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

/** OEE = 가용성 × 성능 × 품질 (각 0~1). 분모 0은 0 처리 */
export function oee({ plannedMin, downtimeMin, idealCycleMin, totalCount, goodCount }: OeeInput): OeeResult {
  const runMin = plannedMin - downtimeMin;
  const availability = plannedMin > 0 ? runMin / plannedMin : 0;
  const performance = runMin > 0 ? (totalCount * idealCycleMin) / runMin : 0;
  const quality = totalCount > 0 ? goodCount / totalCount : 0;
  return { availability, performance, quality, oee: availability * performance * quality };
}
```
Run → PASS (2).

- [ ] **Step 5: 전체 도메인 테스트 + Commit**
Run `npm test -- lib/domain` → 기존 8 + quality 3 + maintenance 4 + oee 2 = 17 passed. `npx tsc --noEmit` 클린.
```bash
git add lib/domain
git commit -m "feat(r2): 도메인 계산(PPM·MTTR·MTBF·OEE) + 테스트"
```

---

### Task 3: seed에 R2 데이터 추가

**Files:** Modify `prisma/seed.ts`.

- [ ] **Step 1: seed 확장** — 기존 seed의 정리(deleteMany) 블록 상단에 새 테이블 정리 추가(의존성 순서: auditLog, alarm, nonconformance, inspection, maintenanceOrder, maintenanceSchedule, defectCode를 기존 정리보다 먼저), 그리고 데이터 생성부 끝에 추가:
  - DefectCode 5종(D-SCR 스크래치, D-DIM 치수불량, D-BUR 버, D-CRK 크랙, D-ASM 조립불량).
  - Inspection 몇 건(완제품 PROCESS PASS qty 100 defect 3; SHIPPING SPECIAL 등) — itemId는 fin.
  - Nonconformance 1건(inspection FAIL 연결, defectCode D-DIM, status OPEN).
  - MaintenanceOrder 2건(EQ-CNC-03 REPAIR: requestedAt/startedAt/finishedAt 채워 완료 1건 + 진행중 1건).
  - MaintenanceSchedule 1건(EQ-CNC-03 intervalDays 30, nextDate).
  - Alarm 3건(crit CNC-03 정지, warn SUS-304 안전재고 미달, info 완료 입고).
정리 순서·외래키 주의. 콘솔 요약 문자열도 갱신.

- [ ] **Step 2: 재시드 + 확인**
Run `npm run db:seed` → 성공. 확인:
`npx tsx -e "import{PrismaClient}from'@prisma/client';const p=new PrismaClient();Promise.all([p.inspection.count(),p.maintenanceOrder.count(),p.alarm.count(),p.defectCode.count()]).then(([i,m,a,d])=>{console.log('insp',i,'maint',m,'alarm',a,'defect',d);return p.\$disconnect();})"`
Expected: 0보다 큰 카운트들.

- [ ] **Step 3: Commit**
```bash
git add prisma/seed.ts
git commit -m "feat(r2): seed에 검사·불량코드·정비·알람 데이터 추가"
```

---

### Task 4: 전체 검증
- [ ] **Step 1**: `npm run db:seed` → `npm test`(도메인 17 포함 전체 통과, 카운트 보고) → `npx tsc --noEmit`(클린) → `npm run build`(성공).
- [ ] **Step 2**: 스모크 — `npx tsx -e`로 검사 데이터에서 ppm 계산 확인(예: 완제품 검사 합계 defect/total → ppm). 실제 출력 보고.
- [ ] **Step 3**: (검증만; 커밋 없음)

---

## Self-Review 결과

**Spec 커버리지:** R2 엔티티(Inspection·Nonconformance·DefectCode·MaintenanceOrder/Schedule·Alarm·AuditLog) 스키마 → Task 1 ✅. 지표 계산(PPM/MTTR/MTBF/OEE) 순수함수+테스트 → Task 2 ✅. seed 최소 데이터 → Task 3 ✅.

**플레이스홀더 스캔:** 없음.

**타입 일관성:** R2 유니온 타입(types.ts)이 스키마 String 필드 허용값과 일치. 도메인 함수 시그니처가 테스트와 동일.

**주의:** SQLite enum 미지원 → String 유지. 기존 모델에 역참조 관계 추가 시 Prisma 양방향 관계 요구 충족. seed 정리 순서(외래키) 주의. dev.db gitignore.

**범위:** R2-A(DB+계산). 이후 R2-B 품질(검사·부적합·PPM 서비스/API/화면) → R2-C 설비보전 → R2-D 재고수불·OEE/알람 대시보드·감사로그·CSV.
