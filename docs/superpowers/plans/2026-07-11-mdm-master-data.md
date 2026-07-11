# 기준정보(MDM) CRUD Implementation Plan (P0 #1)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. dev 서버/포트 3001은 한 번에 하나.

**Goal:** 실운영 필수 1순위 — 품목·작업장·공정·BOM·라우팅을 화면에서 등록/수정/삭제. 현재 seed로만 존재.

**Architecture:** `master-service.ts`가 Prisma CRUD + 무결성 방어(중복코드 친절한 에러, **삭제 전 참조검사**). 기준정보 변경은 민감 → **쓰기 권한 ADMIN**(조회 requireUser). 화면 `/mockups/master` 탭(품목/작업장/공정 → MDM-A, BOM/라우팅 → MDM-B). 네비 "기준정보 > 기준정보 관리".

**Tech Stack:** 기존 스택. 신규 모델 없음(기존 Item·WorkCenter·ProcessStage·BomComponent·Routing·RoutingStep 사용).

**공통 규칙:** 코드 중복 → 친절한 400("이미 존재하는 코드입니다"). 삭제 시 참조 존재 → 400("사용 중이라 삭제할 수 없습니다: <무엇>"). audit 기록. no any. ItemType = "FINISHED"|"SEMI"|"RAW"|"SUB".

---

## PART A — 품목·작업장·공정 (flat CRUD)

### File Structure (A)
| 파일 | 책임 |
|---|---|
| `lib/services/master-service.ts` (+test) | Item·WorkCenter·ProcessStage CRUD + 참조검사 |
| `app/api/items/route.ts` + `[id]/route.ts` | GET/POST, PATCH/DELETE |
| `app/api/work-centers/route.ts` + `[id]/route.ts` | GET/POST, PATCH/DELETE |
| `app/api/process-stages/route.ts` + `[id]/route.ts` | GET/POST, PATCH/DELETE |
| `app/mockups/master/page.tsx` + `master-client.tsx` | 탭(품목/작업장/공정) |
| `app/mockups/layout.tsx` | (수정) 네비 기준정보 관리 |

### Task A1: master-service + 테스트

- [ ] **Step 1: `lib/services/master-service.ts`**
```ts
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ItemType } from "@/lib/domain/types";

function dupError(): never { throw new Error("이미 존재하는 코드입니다."); }
function inUse(what: string): never { throw new Error(`사용 중이라 삭제할 수 없습니다: ${what}`); }
function isP2002(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// ---------- Item ----------
export interface ItemRow { id: string; code: string; name: string; type: ItemType; uom: string; safetyStock: number; }
export async function listItems(): Promise<ItemRow[]> {
  const rows = await prisma.item.findMany({ orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type as ItemType, uom: r.uom, safetyStock: r.safetyStock }));
}
export async function createItem(input: { code: string; name: string; type: ItemType; uom: string; safetyStock: number }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 품목명은 필수입니다.");
  if (input.safetyStock < 0) throw new Error("안전재고는 음수일 수 없습니다.");
  try { return await prisma.item.create({ data: input }); }
  catch (e) { if (isP2002(e)) dupError(); throw e; }
}
export async function updateItem(id: string, input: { name?: string; type?: ItemType; uom?: string; safetyStock?: number }) {
  if (input.safetyStock != null && input.safetyStock < 0) throw new Error("안전재고는 음수일 수 없습니다.");
  return prisma.item.update({ where: { id }, data: input });
}
export async function deleteItem(id: string) {
  const [bomP, bomC, routings, plans, wos, lots, txns, insp, po, gr, so, sh, con, models, docs] = await Promise.all([
    prisma.bomComponent.count({ where: { parentId: id } }),
    prisma.bomComponent.count({ where: { childId: id } }),
    prisma.routing.count({ where: { itemId: id } }),
    prisma.productionPlan.count({ where: { itemId: id } }),
    prisma.workOrder.count({ where: { itemId: id } }),
    prisma.lot.count({ where: { itemId: id } }),
    prisma.inventoryTxn.count({ where: { itemId: id } }),
    prisma.inspection.count({ where: { itemId: id } }),
    prisma.purchaseOrder.count({ where: { itemId: id } }),
    prisma.goodsReceipt.count({ where: { itemId: id } }),
    prisma.salesOrder.count({ where: { itemId: id } }),
    prisma.shipment.count({ where: { itemId: id } }),
    prisma.concession.count({ where: { itemId: id } }),
    prisma.productModel.count({ where: { itemId: id } }),
    prisma.documentRev.count({ where: { itemId: id } }),
  ]);
  const total = bomP + bomC + routings + plans + wos + lots + txns + insp + po + gr + so + sh + con + models + docs;
  if (total > 0) inUse("BOM·주문·재고·검사 등에서 참조됨");
  return prisma.item.delete({ where: { id } });
}

// ---------- WorkCenter ----------
export interface WorkCenterRow { id: string; code: string; name: string; }
export async function listWorkCenters(): Promise<WorkCenterRow[]> {
  const rows = await prisma.workCenter.findMany({ orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name }));
}
export async function createWorkCenter(input: { code: string; name: string }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 이름은 필수입니다.");
  try { return await prisma.workCenter.create({ data: input }); }
  catch (e) { if (isP2002(e)) dupError(); throw e; }
}
export async function updateWorkCenter(id: string, input: { name?: string }) {
  return prisma.workCenter.update({ where: { id }, data: input });
}
export async function deleteWorkCenter(id: string) {
  const [eq, steps, wos] = await Promise.all([
    prisma.equipment.count({ where: { workCenterId: id } }),
    prisma.routingStep.count({ where: { workCenterId: id } }),
    prisma.workOrder.count({ where: { workCenterId: id } }),
  ]);
  if (eq + steps + wos > 0) inUse("설비·라우팅·작업지시에서 참조됨");
  return prisma.workCenter.delete({ where: { id } });
}

// ---------- ProcessStage ----------
export interface ProcessStageRow { id: string; code: string; name: string; seq: number; }
export async function listProcessStages(): Promise<ProcessStageRow[]> {
  const rows = await prisma.processStage.findMany({ orderBy: { seq: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, seq: r.seq }));
}
export async function createProcessStage(input: { code: string; name: string; seq: number }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 이름은 필수입니다.");
  try { return await prisma.processStage.create({ data: input }); }
  catch (e) { if (isP2002(e)) dupError(); throw e; }
}
export async function updateProcessStage(id: string, input: { name?: string; seq?: number }) {
  return prisma.processStage.update({ where: { id }, data: input });
}
export async function deleteProcessStage(id: string) {
  const steps = await prisma.routingStep.count({ where: { processStageId: id } });
  if (steps > 0) inUse("라우팅 공정에서 참조됨");
  return prisma.processStage.delete({ where: { id } });
}
```

- [ ] **Step 2: 테스트 `lib/services/master-service.test.ts`** (afterAll 재seed)
```ts
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import {
  listItems, createItem, updateItem, deleteItem,
  createWorkCenter, deleteWorkCenter, createProcessStage, deleteProcessStage,
} from "@/lib/services/master-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("master-service Item", () => {
  it("생성/수정/삭제", async () => {
    const it0 = await createItem({ code: `MDM-${Date.now().toString().slice(-6)}`, name: "테스트품목", type: "RAW", uom: "EA", safetyStock: 5 });
    const up = await updateItem(it0.id, { name: "수정품목", safetyStock: 9 });
    expect(up.name).toBe("수정품목");
    await deleteItem(it0.id);
    expect((await listItems()).find((r) => r.id === it0.id)).toBeUndefined();
  });
  it("중복 코드는 에러", async () => {
    await expect(createItem({ code: "RM-SUS304", name: "중복", type: "RAW", uom: "kg", safetyStock: 0 })).rejects.toThrow("이미 존재");
  });
  it("참조되는 품목 삭제는 차단", async () => {
    const ref = await prisma.item.findFirstOrThrow({ where: { code: "RM-SUS304" } });
    await expect(deleteItem(ref.id)).rejects.toThrow("사용 중");
  });
});

describe("master-service WorkCenter/ProcessStage", () => {
  it("작업장 생성/삭제", async () => {
    const wc = await createWorkCenter({ code: `WC-${Date.now().toString().slice(-6)}`, name: "테스트작업장" });
    await deleteWorkCenter(wc.id);
  });
  it("공정 생성/삭제", async () => {
    const ps = await createProcessStage({ code: `PS-${Date.now().toString().slice(-6)}`, name: "테스트공정", seq: 99 });
    await deleteProcessStage(ps.id);
  });
});
```
Run → FAIL(모듈) → 구현 후 PASS(5).

- [ ] **Step 3: Commit** — `npm run db:seed` → `npm test -- master-service` PASS → `npx tsc --noEmit`.
```bash
git add lib/services/master-service.ts lib/services/master-service.test.ts
git commit -m "feat(mdm): 기준정보 서비스(품목·작업장·공정 CRUD + 참조검사) + 테스트"
```

### Task A2: API (품목·작업장·공정)
- [ ] 각 엔티티 `route.ts`(GET requireUser · POST requireRole("ADMIN")) + `[id]/route.ts`(PATCH·DELETE requireRole("ADMIN")). `export const runtime="nodejs"`. try/catch → 400 `{error: e.message}`. audit: POST "CREATE", PATCH "UPDATE", DELETE "DELETE" + entity명("Item"/"WorkCenter"/"ProcessStage"). guard 반환 `{user}`|`{res}` 패턴, 기존 sales/concessions route 참조. items POST body {code,name,type,uom,safetyStock}; work-centers {code,name}; process-stages {code,name,seq}. [id] DELETE는 body 없음.
- [ ] 검증 + Commit — `npx tsc --noEmit`, `npm run build`(6 라우트).
```bash
git add app/api/items app/api/work-centers app/api/process-stages
git commit -m "feat(mdm): 기준정보 API(품목·작업장·공정, ADMIN write + audit)"
```

### Task A3: 화면 + 네비
- [ ] `app/mockups/master/page.tsx`(server, force-dynamic) — Promise.all(listItems, listWorkCenters, listProcessStages) → client.
- [ ] `app/mockups/master/master-client.tsx`(client, ToastProvider):
  - SectionHeader "기준정보 · 관리" description "품목 · 작업장 · 공정 등록/수정/삭제".
  - Tabs "품목"/"작업장"/"공정". 각 탭: DataTable + "등록" Button(Dialog) + 행별 "수정"/"삭제" Button.
    - 품목: 코드·품목명·유형(Select ItemType: 완제품 FINISHED/반제품 SEMI/원자재 RAW/부자재 SUB)·단위·안전재고. 등록/수정 Dialog. 코드는 수정 불가(생성만).
    - 작업장: 코드·명.
    - 공정: 코드·명·순서(seq).
  - 삭제는 confirm(간단히 Dialog "삭제하시겠습니까?" 또는 window.confirm 대신 D1 Dialog). DELETE → 200 toast "삭제됨"+refresh; 400 → toast에 서버 메시지(예 "사용 중이라...") crit; 403 → "권한 없음"(관리자 전용).
  - POST/PATCH → toast+refresh; 403 "권한 없음(관리자 전용)".
  D1 컴포넌트/토큰만·no any. ItemType→라벨 로컬 helper.
- [ ] `app/mockups/layout.tsx` 네비 — "기준정보" 그룹 items 맨 위에 `{ label:"기준정보 관리", href:"/mockups/master", icon: Boxes }` 추가(모델/도면 앞). CRUMB `"/mockups/master":[{label:"기준정보"},{label:"기준정보 관리"}]`. lucide `Boxes` import.
- [ ] 검증 + Commit — `npx tsc --noEmit`, `npm run build`(/mockups/master dynamic).
```bash
git add app/mockups/master app/mockups/layout.tsx
git commit -m "feat(mdm): 기준정보 관리 화면(품목·작업장·공정) + 네비"
```

### Task A4: 검증 + 실렌더 + E2E
- [ ] `npm run db:seed` → `npm test` → `npx tsc --noEmit` → `npm run build`.
- [ ] 실렌더(Playwright) `npm run dev`. admin → `/mockups/master`: 품목 탭 seed 4품목 표시. 품목 등록(코드/명/유형/단위/안전재고) → 목록 증가. 수정 → 반영. 삭제(참조 없는 신규품목) → 제거. **참조 품목(RM-SUS304) 삭제 시도 → "사용 중" 에러 토스트**. 작업장·공정 탭 CRUD. operator/viewer 로그인 → 등록/삭제 403(관리자 전용).
- [ ] **E2E 추가**: `e2e/master.spec.ts` — admin 품목 생성→수정→삭제, 중복코드 에러, 참조삭제 차단, viewer 403. `npm run test:e2e` 그린(카운트↑). 
```bash
git add e2e/master.spec.ts
git commit -m "test(mdm): 기준정보 E2E(CRUD·중복·참조삭제·RBAC)"
```
- [ ] 종료 후 `npx kill-port 3001`, `npm run db:seed`.

---

## PART B — BOM·라우팅 (관계형 CRUD)

### Task B1: 도메인(순환검출) + 서비스 확장 + 테스트
- [ ] **Step 1: `lib/domain/bom.ts`에 순환검출 추가**
```ts
/** parent에 child를 추가하면 순환이 생기는가? (child가 parent의 조상이거나 자기 자신) */
export function wouldCreateCycle(parentId: string, childId: string, links: BomLink[]): boolean {
  if (parentId === childId) return true;
  // child로부터 하위(자손) 전개했을 때 parent가 나오면 순환
  const stack = [childId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === parentId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const l of links) if (l.parentId === cur) stack.push(l.childId);
  }
  return false;
}
```
  테스트 `lib/domain/bom.test.ts`에 케이스 추가: 자기참조 true, 직접순환(A→B 존재 시 B→A) true, 정상 false.
- [ ] **Step 2: `master-service.ts`에 BOM·Routing 함수 추가**
```ts
import { wouldCreateCycle, type BomLink } from "@/lib/domain/bom";

// ---------- BOM ----------
export interface BomChildRow { id: string; childId: string; childCode: string; childName: string; qtyPer: number; }
export async function listBom(parentId: string): Promise<BomChildRow[]> {
  const rows = await prisma.bomComponent.findMany({ where: { parentId }, include: { child: true }, orderBy: { child: { code: "asc" } } });
  return rows.map((r) => ({ id: r.id, childId: r.childId, childCode: r.child.code, childName: r.child.name, qtyPer: r.qtyPer }));
}
export async function addBomComponent(input: { parentId: string; childId: string; qtyPer: number }) {
  if (input.qtyPer <= 0) throw new Error("소요량은 0보다 커야 합니다.");
  const links = (await prisma.bomComponent.findMany({ select: { parentId: true, childId: true, qtyPer: true } })) as BomLink[];
  if (wouldCreateCycle(input.parentId, input.childId, links)) throw new Error("순환 BOM은 등록할 수 없습니다.");
  try { return await prisma.bomComponent.create({ data: input }); }
  catch (e) { if (isP2002(e)) throw new Error("이미 등록된 하위 품목입니다."); throw e; }
}
export async function updateBomQty(id: string, qtyPer: number) {
  if (qtyPer <= 0) throw new Error("소요량은 0보다 커야 합니다.");
  return prisma.bomComponent.update({ where: { id }, data: { qtyPer } });
}
export async function removeBomComponent(id: string) { return prisma.bomComponent.delete({ where: { id } }); }

// ---------- Routing ----------
export interface RoutingStepRow { id: string; seq: number; processStageId: string; processName: string; workCenterId: string | null; workCenterName: string | null; stdTimeMin: number; }
export interface RoutingRow { id: string; itemId: string; name: string; steps: RoutingStepRow[]; }
export async function listRoutings(itemId: string): Promise<RoutingRow[]> {
  const rows = await prisma.routing.findMany({
    where: { itemId },
    include: { steps: { include: { processStage: true, workCenter: true }, orderBy: { seq: "asc" } } },
  });
  return rows.map((r) => ({
    id: r.id, itemId: r.itemId, name: r.name,
    steps: r.steps.map((s) => ({
      id: s.id, seq: s.seq, processStageId: s.processStageId, processName: s.processStage.name,
      workCenterId: s.workCenterId, workCenterName: s.workCenter?.name ?? null, stdTimeMin: s.stdTimeMin,
    })),
  }));
}
export async function createRouting(input: { itemId: string; name: string }) {
  if (!input.name.trim()) throw new Error("라우팅 이름은 필수입니다.");
  return prisma.routing.create({ data: input });
}
export async function deleteRouting(id: string) {
  await prisma.routingStep.deleteMany({ where: { routingId: id } });
  return prisma.routing.delete({ where: { id } });
}
export async function addRoutingStep(input: { routingId: string; processStageId: string; workCenterId?: string; seq: number; stdTimeMin: number }) {
  if (input.seq < 0 || input.stdTimeMin < 0) throw new Error("순서·표준시간은 음수일 수 없습니다.");
  return prisma.routingStep.create({ data: { routingId: input.routingId, processStageId: input.processStageId, workCenterId: input.workCenterId ?? null, seq: input.seq, stdTimeMin: input.stdTimeMin } });
}
export async function removeRoutingStep(id: string) { return prisma.routingStep.delete({ where: { id } }); }
```
- [ ] **Step 3: 테스트 `master-service.test.ts`에 BOM/Routing describe 추가** — addBomComponent 정상, 순환 차단(seed FG→SEMI→RAW 존재 시 RAW에 FG를 자식으로 추가 시도 → 순환 에러), 중복 차단, updateBomQty, removeBomComponent; createRouting+addRoutingStep+listRoutings+removeRoutingStep. afterAll 재seed 유지.
  Run → PASS.
- [ ] **Step 4: Commit**
```bash
git add lib/domain/bom.ts lib/domain/bom.test.ts lib/services/master-service.ts lib/services/master-service.test.ts
git commit -m "feat(mdm): BOM·라우팅 서비스(순환검출·소요량·공정단계) + 테스트"
```

### Task B2: API (BOM·라우팅)
- [ ] `app/api/bom-components/route.ts`(POST addBomComponent, requireRole ADMIN) + `[id]/route.ts`(PATCH updateBomQty, DELETE removeBomComponent). GET는 `?parentId=` 필터로 listBom(requireUser).
- [ ] `app/api/routings/route.ts`(GET `?itemId=` listRoutings requireUser; POST createRouting ADMIN; ) + `[id]/route.ts`(DELETE deleteRouting ADMIN).
- [ ] `app/api/routing-steps/route.ts`(POST addRoutingStep ADMIN) + `[id]/route.ts`(DELETE removeRoutingStep ADMIN).
- audit·runtime nodejs·try/catch 400 통일.
- [ ] 검증 + Commit — `npx tsc --noEmit`, `npm run build`.
```bash
git add app/api/bom-components app/api/routings app/api/routing-steps
git commit -m "feat(mdm): BOM·라우팅 API(ADMIN write + audit)"
```

### Task B3: 화면(BOM·라우팅 탭)
- [ ] `master/page.tsx` 확장 — listItems·listProcessStages·listWorkCenters 전달(BOM/라우팅 편집에 필요). BOM/Routing 데이터는 품목 선택 시 클라이언트에서 fetch(GET ?parentId/?itemId).
- [ ] `master-client.tsx`에 탭 "BOM"·"라우팅" 추가:
  - BOM 탭: 상위품목 Select → 하위 목록 DataTable(코드·명·소요량·삭제) + "하위 추가" Dialog(하위품목 Select·소요량) → POST /api/bom-components(순환/중복 시 서버 에러 토스트) → 목록 갱신. 소요량 인라인 수정 또는 수정 Dialog.
  - 라우팅 탭: 품목 Select → 라우팅 목록 + "라우팅 추가"(이름) → 선택 라우팅의 스텝 DataTable(순서·공정·작업장·표준시간·삭제) + "공정 추가" Dialog(공정 Select·작업장 Select(선택)·순서·표준시간) → POST /api/routing-steps.
  fetch 후 상태 갱신(router.refresh 또는 로컬 state). no any. D1만.
- [ ] 검증 + Commit — `npx tsc --noEmit`, `npm run build`.
```bash
git add app/mockups/master
git commit -m "feat(mdm): 기준정보 화면에 BOM·라우팅 편집 탭 추가"
```

### Task B4: 검증 + 실렌더 + E2E
- [ ] 테스트/빌드 게이트. 실렌더: admin BOM 탭에서 FG-GB2500 하위(SF-SHAFT) 표시, 하위 추가/삭제, **순환 추가 시도 차단(RAW에 FG)**, 라우팅 생성+공정 추가. viewer/operator 403.
- [ ] `e2e/master.spec.ts` 확장(또는 `e2e/mdm-bom.spec.ts`): BOM 추가/순환차단/삭제, 라우팅 스텝 추가. `npm run test:e2e` 그린.
```bash
git add e2e
git commit -m "test(mdm): BOM·라우팅 E2E(추가·순환차단·라우팅스텝)"
```
- [ ] 종료 정리(`npx kill-port 3001`, `npm run db:seed`).

---

## Self-Review 결과
**커버리지:** 품목·작업장·공정·BOM·라우팅 CRUD + 무결성(중복코드·삭제참조검사·순환BOM) + ADMIN RBAC + audit + E2E ✅.
**주의:** 기준정보 쓰기=ADMIN(operator도 403). 삭제 전 참조 count 검사로 FK 고아 방지. BOM 순환은 도메인 순수함수로 검출·테스트. Radix Select 빈값 금지→sentinel(작업장 선택). afterAll 재seed(쓰기 테스트).
**범위:** P0 #1. 이후 #2(부하/동시성 실측) → #3(zod·error 경계·rate-limit).
