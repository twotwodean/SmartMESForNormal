# R3-D 특채·모델/도면 모듈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** FR-QLT-4(특채: 조건부 합격 요청·승인/반려) + FR-MST-5~6(제품 모델·도면/문서 리비전) 서비스·API·화면.

**Architecture:** DB(Concession·ProductModel·DocumentRev)는 R3-A에서 완료. 신규 `concession-service`(요청/승인/반려), `catalog-service`(모델·문서 목록/등록). API 조회(requireUser)+변경(requireRole OPERATOR)+audit. 화면 `/mockups/concession`, `/mockups/catalog`(모델/도면 탭). 네비 추가.

**Tech Stack:** 기존 스택(Next 14, Prisma+SQLite, Vitest). ConcessionStatus 타입은 lib/domain/types.ts에 이미 존재.

---

## File Structure
| 파일 | 책임 |
|---|---|
| `lib/services/concession-service.ts` (+test) | 특채 목록/요청·승인/반려 |
| `lib/services/catalog-service.ts` (+test) | 제품모델·문서 목록/등록 |
| `app/api/concessions/route.ts` | GET/POST |
| `app/api/concessions/[id]/route.ts` | PATCH approve/reject + audit |
| `app/api/product-models/route.ts` | GET/POST |
| `app/api/documents/route.ts` | GET/POST |
| `app/mockups/concession/page.tsx`+client | 특채 화면 |
| `app/mockups/catalog/page.tsx`+client | 모델/도면 화면 |
| `app/mockups/layout.tsx` | (수정) 네비 특채·모델/도면 |

---

### Task 1: concession-service + catalog-service + 테스트

- [ ] **Step 1: `lib/services/concession-service.ts`**
```ts
import { prisma } from "@/lib/db";
import type { ConcessionStatus } from "@/lib/domain/types";

export interface ConcessionRow {
  id: string;
  itemName: string;
  qty: number;
  reason: string;
  status: ConcessionStatus;
  requestedAt: string;
  decidedAt: string | null;
}

export async function listConcessions(): Promise<ConcessionRow[]> {
  const rows = await prisma.concession.findMany({ include: { item: true }, orderBy: { requestedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, itemName: r.item.name, qty: r.qty, reason: r.reason,
    status: r.status as ConcessionStatus,
    requestedAt: r.requestedAt.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
  }));
}

export async function createConcession(input: { itemId: string; qty: number; reason: string }) {
  if (input.qty <= 0) throw new Error("수량은 1 이상이어야 합니다.");
  if (!input.reason.trim()) throw new Error("사유를 입력하세요.");
  return prisma.concession.create({ data: { itemId: input.itemId, qty: input.qty, reason: input.reason, status: "REQUESTED" } });
}

/** 승인/반려: REQUESTED 상태에서만 결정, decidedAt 기록 */
export async function decideConcession(id: string, approve: boolean) {
  const c = await prisma.concession.findUnique({ where: { id } });
  if (!c) throw new Error("특채 요청을 찾을 수 없습니다.");
  if (c.status !== "REQUESTED") throw new Error("이미 처리된 요청입니다.");
  return prisma.concession.update({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date() },
  });
}
```

- [ ] **Step 2: `lib/services/catalog-service.ts`**
```ts
import { prisma } from "@/lib/db";

export interface ProductModelRow { id: string; code: string; name: string; spec: string | null; itemName: string; }
export async function listProductModels(): Promise<ProductModelRow[]> {
  const rows = await prisma.productModel.findMany({ include: { item: true }, orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, spec: r.spec ?? null, itemName: r.item.name }));
}
export async function createProductModel(input: { itemId: string; code: string; name: string; spec?: string }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 이름은 필수입니다.");
  return prisma.productModel.create({ data: { itemId: input.itemId, code: input.code, name: input.name, spec: input.spec || null } });
}

export interface DocumentRow { id: string; name: string; rev: string; note: string | null; itemName: string | null; createdAt: string; }
export async function listDocuments(): Promise<DocumentRow[]> {
  const rows = await prisma.documentRev.findMany({ include: { item: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, name: r.name, rev: r.rev, note: r.note ?? null, itemName: r.item?.name ?? null, createdAt: r.createdAt.toISOString() }));
}
export async function createDocument(input: { name: string; rev?: string; note?: string; itemId?: string }) {
  if (!input.name.trim()) throw new Error("문서명은 필수입니다.");
  return prisma.documentRev.create({ data: { name: input.name, rev: input.rev || "A", note: input.note || null, itemId: input.itemId || null } });
}
```

- [ ] **Step 3: 테스트 `lib/services/concession-service.test.ts`** (afterAll 재seed)
```ts
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listConcessions, createConcession, decideConcession } from "@/lib/services/concession-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("concession-service", () => {
  it("seed 특채 요청이 조회된다", async () => {
    const rows = await listConcessions();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.status === "REQUESTED")).toBe(true);
  });
  it("요청 생성 후 승인하면 APPROVED + decidedAt", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const c = await createConcession({ itemId: item.id, qty: 3, reason: "치수 경미 초과" });
    const decided = await decideConcession(c.id, true);
    expect(decided.status).toBe("APPROVED");
    expect(decided.decidedAt).not.toBeNull();
  });
  it("이미 처리된 요청 재결정은 에러", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const c = await createConcession({ itemId: item.id, qty: 1, reason: "x" });
    await decideConcession(c.id, false);
    await expect(decideConcession(c.id, true)).rejects.toThrow();
  });
});
```

- [ ] **Step 4: 테스트 `lib/services/catalog-service.test.ts`** (afterAll 재seed)
```ts
import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { listProductModels, createProductModel, listDocuments, createDocument } from "@/lib/services/catalog-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("catalog-service", () => {
  it("모델 목록 조회 + 등록", async () => {
    const item = await prisma.item.findFirstOrThrow();
    const before = (await listProductModels()).length;
    await createProductModel({ itemId: item.id, code: `PM-TEST-${Date.now().toString().slice(-5)}`, name: "테스트 모델" });
    expect((await listProductModels()).length).toBe(before + 1);
  });
  it("문서 목록 조회 + 등록(기본 rev A)", async () => {
    const before = (await listDocuments()).length;
    const doc = await createDocument({ name: "테스트 도면" });
    expect(doc.rev).toBe("A");
    expect((await listDocuments()).length).toBe(before + 1);
  });
});
```
Run → FAIL(모듈) → 구현 후 PASS. (afterAll 재seed 원복.)

- [ ] **Step 5: 확인 + Commit** — `npm run db:seed` → `npm test -- concession-service catalog-service` PASS → `npx tsc --noEmit` 클린.
```bash
git add lib/services/concession-service.ts lib/services/concession-service.test.ts lib/services/catalog-service.ts lib/services/catalog-service.test.ts
git commit -m "feat(r3): 특채·카탈로그 서비스(요청/승인·모델/문서) + 테스트"
```

---

### Task 2: API

- [ ] **Step 1: `app/api/concessions/route.ts`** — `export const runtime = "nodejs";` GET listConcessions(requireUser); POST createConcession(requireRole OPERATOR, body {itemId,qty,reason}, try/catch 400, 201).
- [ ] **Step 2: `app/api/concessions/[id]/route.ts`** — PATCH requireRole OPERATOR, body {action:"approve"|"reject"} → decideConcession(id, action==="approve") + audit(action==="approve"?"CONCESSION_APPROVE":"CONCESSION_REJECT","Concession",id); try/catch 400.
- [ ] **Step 3: `app/api/product-models/route.ts`** — GET listProductModels(requireUser); POST createProductModel(requireRole OPERATOR, {itemId,code,name,spec?}) + audit("CREATE","ProductModel",m.id).
- [ ] **Step 4: `app/api/documents/route.ts`** — GET listDocuments(requireUser); POST createDocument(requireRole OPERATOR, {name,rev?,note?,itemId?}) + audit("CREATE","DocumentRev",d.id).
guard 패턴(lib/api/guard.ts requireUser/requireRole 반환 `{user}`|`{res}`)·runtime nodejs 통일. 기존 sales/procurement route.ts 참조.
- [ ] **Step 5: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(4 라우트).
```bash
git add app/api/concessions app/api/product-models app/api/documents
git commit -m "feat(r3): 특채·카탈로그 API(요청/승인·모델/문서, RBAC+audit)"
```

---

### Task 3: 화면 + 네비

- [ ] **Step 1: `app/mockups/concession/page.tsx`** (server, force-dynamic) — Promise.all(listConcessions(), listItemsBrief() from quality-service) → client.
- [ ] **Step 2: `app/mockups/concession/concession-client.tsx`** (client, ToastProvider, procurement-client.tsx 미러):
  - SectionHeader "품질 · 특채(조건부 합격)" + actions "특채 요청" Button(Dialog).
  - DataTable(concessions): 품목·수량·사유·상태(StatusPill: REQUESTED warn 요청/APPROVED ok 승인/REJECTED crit 반려)·요청일(slice0,10)·결정일(decidedAt?slice0,10:"-")·액션(status==="REQUESTED"→ "승인" Button + "반려" Button; else 없음). enableFilter.
  - 특채 요청 Dialog: 품목 Select(items)·수량 NumberStepper·사유 Input(또는 textarea) → POST /api/concessions → toast "특채 요청됨"+refresh; 403 "권한 없음".
  - 승인/반려 핸들러: PATCH /api/concessions/[id] {action} → toast(approve?"승인됨":"반려됨")+refresh; 403.
  D1 컴포넌트만·토큰만·no any. 상태→tone 로컬 helper.
- [ ] **Step 3: `app/mockups/catalog/page.tsx`** (server, force-dynamic) — Promise.all(listProductModels(), listDocuments(), listItemsBrief()) → client.
- [ ] **Step 4: `app/mockups/catalog/catalog-client.tsx`** (client, ToastProvider):
  - SectionHeader "기준정보 · 모델/도면".
  - Tabs "모델" / "도면".
    - 모델 tab: DataTable(models): 코드(mono)·모델명·품목·사양(spec??"-"). actions "모델 등록" Button(Dialog: 품목 Select·코드 Input·모델명 Input·사양 Input) → POST /api/product-models → toast "모델 등록됨"+refresh; 403.
    - 도면 tab: DataTable(documents): 문서명·리비전(rev)·품목(itemName??"-")·비고(note??"-")·등록일(slice0,10). actions "도면 등록" Button(Dialog: 문서명 Input·리비전 Input(default A)·품목 Select(선택, 빈값 허용)·비고 Input) → POST /api/documents → toast "도면 등록됨"+refresh; 403.
  D1 컴포넌트만·no any.
- [ ] **Step 5: `app/mockups/layout.tsx` 네비** — "품질·추적" 그룹 items에 `{ label:"특채", href:"/mockups/concession", icon: ShieldCheck }`. 새 그룹 또는 "시스템"에 `{ label:"모델/도면", href:"/mockups/catalog", icon: FileText }` (기준정보 성격 → 적절한 그룹 선택; 없으면 "기준정보" 그룹 신설). CRUMB 두 항목 추가. lucide import(ShieldCheck, FileText — 기존 import과 중복 확인).
- [ ] **Step 6: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`(/mockups/concession, /mockups/catalog dynamic).
```bash
git add app/mockups/concession app/mockups/catalog app/mockups/layout.tsx
git commit -m "feat(r3): 특채·모델/도면 화면 + 네비"
```

---

### Task 4: 전체 검증 + 실렌더
- [ ] **Step 1** `npm run db:seed` → `npm test`(특채·카탈로그 포함 통과, 카운트) → `npx tsc --noEmit` → `npm run build`.
- [ ] **Step 2 실렌더(Playwright)** `npm run dev`(3001). admin:
  - `/mockups/concession`: seed 특채 1건(REQUESTED) 표시. "승인" → toast, 상태 승인(APPROVED)·결정일 표시. "특채 요청" → 품목·수량·사유 → 등록 → 목록 증가.
  - `/mockups/catalog`: 모델 탭 seed PM-GB2500-A 표시, "모델 등록" 동작. 도면 탭 seed 문서 표시, "도면 등록" 동작(rev 기본 A).
  - viewer → 특채 승인/요청, 모델/도면 등록 각 403.
  Report ACTUAL. 종료 후 `npm run db:seed`, `npx kill-port 3001`, 스크래치 삭제.
- [ ] **Step 3** 이슈 수정 시 별도 커밋. off-by-one 유사(날짜) 없음(특채/카탈로그는 날짜 입력 없음).

---

## Self-Review 결과
**Spec 커버리지:** FR-QLT-4(특채 요청/승인/반려) → concession-service+화면 ✅. FR-MST-5~6(모델·도면/문서) → catalog-service+화면 ✅. RBAC(변경 OPERATOR+)+audit ✅.
**플레이스홀더 스캔:** 없음.
**타입 일관성:** ConcessionStatus(domain)·ConcessionRow/ProductModelRow/DocumentRow(service). decideConcession 상태전이 가드(REQUESTED만).
**주의:** 쓰기 테스트 afterAll 재seed. DocumentRev.itemId optional(빈값 허용). 날짜 입력 없어 off-by-one 무관.
**범위:** R3-D로 R3 완료 → 이후 R4.
