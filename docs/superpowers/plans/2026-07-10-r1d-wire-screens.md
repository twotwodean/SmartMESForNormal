# R1-D 화면 실데이터 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** D2 목업 7화면의 정적 목데이터를 R1-C API/서비스의 실데이터로 교체하고, 생산 폐루프를 UI로 관통시킨다(실적 등록→재고·대시보드 반영). 톱바에 로그인 사용자·로그아웃 노출, RBAC UI 반영(VIEWER는 변경 불가).

**Architecture:** 조회 화면은 **서버 컴포넌트 page.tsx가 서비스를 직접 호출**(HTTP 왕복 없음)해 데이터를 얻고, 상호작용이 있는 부분은 `*-client.tsx`(클라이언트)에 props로 주입. 변경(실적 등록)은 클라이언트에서 `/api/production/results`로 POST. 톱바 사용자 정보는 `GET /api/auth/me`로 조회, 로그아웃은 `/api/auth/logout` 호출 후 `/login` 이동. 정적 목데이터(lib/mock-data.ts)는 R2 지표(OEE·PPM·라인·알람) 자리표시자로만 잔존(주석 명시).

**Tech Stack:** Next.js App Router(server+client 분리), 기존 서비스/API, Playwright 검증.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `app/api/auth/me/route.ts` | GET 현재 사용자 |
| `app/mockups/layout.tsx` | (수정) 사용자/로그아웃 표시(작은 client 위젯) |
| `components/app/user-menu.tsx` | 사용자명·역할·로그아웃 버튼(client) |
| `app/mockups/inventory/page.tsx`(server) + `inventory-client.tsx` | 실 재고 |
| `app/mockups/work-orders/page.tsx`(server) + `work-orders-client.tsx` | 실 작업지시(+상태전이) |
| `app/mockups/genealogy/page.tsx`(server) + `genealogy-client.tsx` | 실 Lot 목록/계보 |
| `app/mockups/manager/page.tsx`(server) + `manager-client.tsx` | 실 WO·재고경고(+R2 정적 지표) |
| `app/mockups/exec/page.tsx`(server) | 실 요약(+R2 정적) |
| `app/mockups/production/page.tsx` | 실 WO 선택 + 실적 POST |
| `app/kiosk/page.tsx` | 실 WO 선택 + 실적 POST |

R1 폐루프: 대시보드·재고·작업지시·실적·Lot. FR-PRD-3/5/6, FR-DSH-1, FR-MAT-1, FR-SEC(UI).

---

### Task 1: /api/auth/me + 톱바 사용자/로그아웃

**Files:** Create `app/api/auth/me/route.ts`, `components/app/user-menu.tsx`; Modify `app/mockups/layout.tsx`.

- [ ] **Step 1: `app/api/auth/me/route.ts`**
```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
export const runtime = "nodejs";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: { name: user.name, role: user.role, username: user.username } });
}
```

- [ ] **Step 2: `components/app/user-menu.tsx`** (client)
```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { ADMIN: "관리자", OPERATOR: "작업자", VIEWER: "조회자" };

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ name: string; role: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;
  return (
    <div className="flex items-center gap-2 text-body-sm">
      <span className="text-text">{user.name} <span className="text-text-faint">({ROLE_LABEL[user.role] ?? user.role})</span></span>
      <button
        type="button"
        onClick={logout}
        aria-label="로그아웃"
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <LogOut size={14} aria-hidden /> 로그아웃
      </button>
    </div>
  );
}
```

- [ ] **Step 3: `app/mockups/layout.tsx` 수정** — Topbar의 `right` 슬롯에 `<UserMenu />`를 ThemeToggle 앞에 추가. import 추가: `import { UserMenu } from "@/components/app/user-menu";`. 즉 `right={<><ConnectionBadge .../><Clock/><UserMenu/><ThemeToggle/></>}`. 나머지 그대로.

- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`(클린), `npm run build`(성공, /api/auth/me 라우트).
```bash
git add app/api/auth/me components/app/user-menu.tsx app/mockups/layout.tsx
git commit -m "feat(r1): 톱바 사용자/로그아웃(UserMenu) + /api/auth/me"
```

---

### Task 2: 재고 + 작업지시 화면 실데이터

**Files:** inventory: split page(server)+inventory-client; work-orders: split page(server)+work-orders-client.

- [ ] **Step 1: `app/mockups/inventory/inventory-client.tsx`** — 기존 inventory/page.tsx의 UI(“use client”)를 그대로 옮기되, `INVENTORY` import 대신 `rows: StockRow[]` props를 받아 사용. 컬럼/배너/Drawer 동일. `StockRow`는 `@/lib/services/inventory-service`에서 import(itemId·code·name·qty·safety·uom·status). status 라벨 매핑(NORMAL 정상/BELOW 미달/NEGATIVE 음수) 유지. 수불 Drawer의 TXNS는 이번엔 실제 값이 없으므로 “수불 이력(요약)” 정적 유지 또는 간단화(품목별 실 이력은 R2). 배너 카운트 = `rows.filter(r=>r.status!=="NORMAL").length`.
```tsx
"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, stockTone } from "@/components/ui/status-pill";
import type { StockRow } from "@/lib/services/inventory-service";
import type { StockStatus } from "@/lib/domain/types";

const STATUS_LABEL: Record<StockStatus, string> = { NORMAL: "정상", BELOW: "미달", NEGATIVE: "음수" };

export function InventoryClient({ rows }: { rows: StockRow[] }) {
  const warn = rows.filter((r) => r.status !== "NORMAL").length;
  const columns: ColumnDef<StockRow>[] = [
    { accessorKey: "code", header: "품목코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "qty", header: "현재고", cell: (c) => { const v = c.getValue<number>(); return <span className={`num ${v < 0 ? "text-crit font-semibold" : "text-text"}`}>{v.toLocaleString()}</span>; } },
    { accessorKey: "safety", header: "안전재고", cell: (c) => <span className="num text-text-muted">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "uom", header: "단위" },
    { accessorKey: "status", header: "상태", cell: (c) => { const s = c.getValue<StockStatus>(); return <StatusPill tone={stockTone(s)}>{STATUS_LABEL[s]}</StatusPill>; } },
  ];
  return (
    <>
      <SectionHeader title="재고 현황" description="실시간 파생 현재고(수불 합계) · 안전재고 대비" />
      {warn > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
          ⚠ 재고 경고 {warn}건 — 안전재고 미달·음수 품목이 있습니다.
        </div>
      )}
      <Card><CardContent><DataTable columns={columns} data={rows} enableFilter filterPlaceholder="품목 검색" /></CardContent></Card>
    </>
  );
}
```

- [ ] **Step 2: `app/mockups/inventory/page.tsx`** (server)
```tsx
import { listStock } from "@/lib/services/inventory-service";
import { InventoryClient } from "./inventory-client";
export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const rows = await listStock();
  return <InventoryClient rows={rows} />;
}
```

- [ ] **Step 3: `app/mockups/work-orders/work-orders-client.tsx`** — 기존 work-orders UI를 옮기되 `WORK_ORDERS` 대신 `rows: WorkOrderRow[]` props 사용. 리스트(DataTable)·칸반(WorkOrderCard)·상세 Drawer(+Stepper) 유지. 진척(progress)은 R1 WorkOrderRow에 없으므로 상태 기반 표시(대기 0%/진행 진행중/완료 100%) 또는 진척 컬럼 제거 — **진척 컬럼 제거**하고 상태·수량·작업장 중심으로. Stepper current는 상태로 매핑(WAITING 0·RUNNING 2·DONE 4). `WorkOrderRow`는 `@/lib/services/work-order-service`에서 import(id·code·itemName·qty·status·center).
```tsx
"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { WorkOrderCard } from "@/components/ui/work-order-card";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import type { WorkOrderRow } from "@/lib/services/work-order-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

const LABEL: Record<WorkOrderStatus, string> = { WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소" };
const COLS: { status: WorkOrderStatus; title: string }[] = [
  { status: "WAITING", title: "대기" }, { status: "RUNNING", title: "진행" }, { status: "DONE", title: "완료" },
];
const STEPS = ["절단", "가공", "조립", "검사", "포장"];
const stepFor = (s: WorkOrderStatus) => (s === "DONE" ? 4 : s === "RUNNING" ? 2 : 0);

export function WorkOrdersClient({ rows }: { rows: WorkOrderRow[] }) {
  const [sel, setSel] = React.useState<WorkOrderRow | null>(null);
  const columns: ColumnDef<WorkOrderRow>[] = [
    { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "status", header: "상태", cell: (c) => { const s = c.getValue<WorkOrderStatus>(); return <StatusPill tone={workOrderTone(s)}>{LABEL[s]}</StatusPill>; } },
    { accessorKey: "center", header: "작업장" },
    { id: "act", header: "", cell: (c) => <Button variant="ghost" size="sm" onClick={() => setSel(c.row.original)}>상세</Button> },
  ];
  return (
    <>
      <SectionHeader title="작업지시" description="실 데이터 · 리스트/칸반 · 클릭 시 상세" />
      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">리스트</TabsTrigger><TabsTrigger value="kanban">칸반</TabsTrigger></TabsList>
        <TabsContent value="list"><DataTable columns={columns} data={rows} enableFilter filterPlaceholder="지시·품목 검색" /></TabsContent>
        <TabsContent value="kanban">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLS.map((col) => {
              const items = rows.filter((w) => w.status === col.status);
              return (
                <div key={col.status} className="rounded-lg border border-border bg-bg/40 p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-body-sm font-semibold text-text">{col.title}</span><span className="num text-caption text-text-faint">{items.length}</span></div>
                  <div className="flex flex-col gap-2">
                    {items.map((w) => <WorkOrderCard key={w.code} code={w.code} item={w.itemName} qty={w.qty} statusLabel={LABEL[w.status]} tone={workOrderTone(w.status)} center={w.center} onClick={() => setSel(w)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <Drawer open={sel !== null} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{sel?.code} 상세</DrawerTitle></DrawerHeader>
          <DrawerBody>
            {sel && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2"><StatusPill tone={workOrderTone(sel.status)}>{LABEL[sel.status]}</StatusPill><span className="text-body-sm text-text">{sel.itemName}</span></div>
                <dl className="grid grid-cols-2 gap-2 text-body-sm">
                  <dt className="text-text-muted">수량</dt><dd className="num text-text">{sel.qty.toLocaleString()} EA</dd>
                  <dt className="text-text-muted">작업장</dt><dd className="text-text">{sel.center}</dd>
                </dl>
                <div><div className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-faint">공정 진행</div><Stepper steps={STEPS} current={stepFor(sel.status)} /></div>
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 4: `app/mockups/work-orders/page.tsx`** (server)
```tsx
import { listWorkOrders } from "@/lib/services/work-order-service";
import { WorkOrdersClient } from "./work-orders-client";
export const dynamic = "force-dynamic";
export default async function WorkOrdersPage() {
  const rows = await listWorkOrders();
  return <WorkOrdersClient rows={rows} />;
}
```

- [ ] **Step 5: 검증 + Commit** — `npx tsc --noEmit`(클린), `npm run build`(성공, 두 라우트 dynamic).
```bash
git add app/mockups/inventory app/mockups/work-orders
git commit -m "feat(r1): 재고·작업지시 화면 실데이터 연동(server component + service)"
```

---

### Task 3: 생산실적 입력 + 키오스크 실 POST

**Files:** Modify `app/mockups/production/page.tsx`, `app/kiosk/page.tsx`.

- [ ] **Step 1: production 화면** — 서버 page가 `listWorkOrders()`로 대상 WO(대기/진행)를 얻어 client에 주입, client는 선택 WO에 대해 `POST /api/production/results {workOrderId, goodQty, defectQty, downtimeMin}` 호출 → 성공 시 Toast + 폼 리셋 + `router.refresh()`(재고/상태 갱신). 403이면 “권한 없음” Toast(crit).
`app/mockups/production/page.tsx` (server):
```tsx
import { listWorkOrders } from "@/lib/services/work-order-service";
import { ProductionClient } from "./production-client";
export const dynamic = "force-dynamic";
export default async function ProductionPage() {
  const rows = (await listWorkOrders()).filter((w) => w.status === "WAITING" || w.status === "RUNNING");
  return <ProductionClient targets={rows} />;
}
```
`app/mockups/production/production-client.tsx` (client): 기존 production UI 이식하되 `targets: WorkOrderRow[]` props, submit이 fetch로 POST. import ToastProvider/useToast/NumberStepper/Select/Button/Card/StatusPill/workOrderTone/useRouter. WorkOrderRow는 work-order-service에서. 불량코드 Select는 DEFECT_CODES(mock-data) 유지. submit:
```tsx
const res = await fetch("/api/production/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workOrderId: selected.id, goodQty: good, defectQty: defect, downtimeMin: downtime }) });
if (res.ok) { toast({ title: "실적 등록됨", description: `${selected.code} · 양품 ${good}`, tone: "ok" }); setGood(0); setDefect(0); setDefectCode(""); setDowntime(0); router.refresh(); }
else if (res.status === 403) { toast({ title: "권한 없음", description: "실적 등록은 작업자 이상만 가능합니다.", tone: "crit" }); }
else { toast({ title: "등록 실패", tone: "crit" }); }
```
(선택 WO는 `selected: WorkOrderRow`; 목록이 비면 안내 문구.)

- [ ] **Step 2: kiosk 화면** — `app/kiosk/page.tsx`를 server+client로 분리(또는 client에서 /api/work-orders fetch). 서버 분리 권장: `app/kiosk/page.tsx`(server)가 listWorkOrders 필터→`KioskClient` 주입; client는 KioskNumpad로 good 입력, 등록 시 `POST /api/production/results` 호출→Toast+리셋. 크롬 없음 유지, ToastProvider 래핑, “관리자 화면” 링크 유지.

- [ ] **Step 3: 검증 + Commit** — `npx tsc --noEmit`(클린), `npm run build`(성공).
```bash
git add app/mockups/production app/kiosk
git commit -m "feat(r1): 생산실적 입력·키오스크 실 API POST 연동(폐루프)"
```

---

### Task 4: 대시보드(관리·경영) + Lot 추적 실데이터

**Files:** manager/exec/genealogy를 server+client 분리 또는 server에서 서비스 호출.

- [ ] **Step 1: manager** — server page가 `getDashboard()`+`listWorkOrders()`로 데이터 주입. client는 작업지시 DataTable(실 rows), 재고 경고 배너(dashboard.stockWarnings), WO 상태 요약. OEE·PPM·라인·알람 KPI/카드는 **R2 정적 자리표시자**로 유지(주석 `{/* R2: 실데이터 연동 예정 */}`). “재고 경고” KPI value = stockWarnings.length(실).
- [ ] **Step 2: exec** — server page가 `getDashboard()` 주입. 요약 지표 중 재고 경고·WO 상태는 실, 나머지 정적(R2).
- [ ] **Step 3: genealogy** — server page가 `listLots()` 주입; client는 Lot 선택 시 `GET /api/lots/[code]`로 계보 fetch해 GenealogyTree/상세 표시. (트리 소스가 실 데이터.)
- [ ] **Step 4: 검증 + Commit** — `npx tsc --noEmit`, `npm run build`.
```bash
git add app/mockups/manager app/mockups/exec app/mockups/genealogy
git commit -m "feat(r1): 대시보드·Lot추적 실데이터 연동(R2 지표는 자리표시자 유지)"
```

---

### Task 5: 전체 검증 + UI 폐루프 실렌더(Playwright)

- [ ] **Step 1: 게이트** — `npm run db:seed` → `npm test`(전체 통과, 카운트) → `npx tsc --noEmit`(클린) → `npm run build`(성공).
- [ ] **Step 2: UI 폐루프 (Next dev + Playwright, 로그인 세션 유지)**
Start `npm run dev`(3001).
- admin 로그인 → `/mockups/inventory`에서 RM-SUS304 180·미달 표시(실데이터), 톱바에 “관리자” + 로그아웃 보임.
- `/mockups/work-orders` 실 WO 표시(seed WO). `/mockups/manager` 재고 경고 배너·WO 표시.
- **UI 폐루프**: `/mockups/production`에서 seed WO 선택, 양품 50 입력, “실적 등록” → Toast “실적 등록됨”. 이후 `/mockups/inventory` 재방문 시 완제품(FG-GB2500) 현재고가 +50 반영(120→170) 확인.
- `/mockups/genealogy`에서 Lot 선택 시 계보(원자재→반제품) 표시.
- **RBAC UI**: viewer 로그인 → `/mockups/production`에서 “실적 등록” → 403 처리로 “권한 없음” Toast(재고 변화 없음).
- 로그아웃 → 보호 경로 접근 시 /login.
Report ACTUAL(재고 120→170, Toast, RBAC). 종료 후 `npm run db:seed` 원복, `npx kill-port 3001`(no bulk node kill), 스크래치 삭제.
- [ ] **Step 3:** 이슈 수정 시 별도 커밋 후 재확인.

---

## Self-Review 결과

**Spec 커버리지 (R1 폐루프):**
- FR-DSH-1 실시간 생산현황(대시보드 실 WO·재고경고) → Task 4 ✅
- FR-PRD-2/6 작업지시 현황 → Task 2 ✅ / FR-PRD-3 실적 등록(UI→API) → Task 3 ✅
- FR-PRD-5 Lot 추적(실 계보) → Task 4 ✅ / FR-MAT-1 재고 현황(실 파생) → Task 2 ✅
- FR-SEC UI: 로그인 사용자/로그아웃(Task 1), RBAC(VIEWER 변경 불가 UI, Task 3) ✅
- **폐루프 UI 실렌더 검증**(실적→재고 반영) → Task 5 ✅

**플레이스홀더 스캔:** R2 지표(OEE·PPM·라인·알람)는 의도적 자리표시자(주석 명시). R1 범위 데이터는 전부 실연동. 코드 스텝에 실제 코드/명시 지침 포함.

**타입 일관성:** 서비스 반환 타입(StockRow·WorkOrderRow·LotTree·DashboardData)을 client props로 그대로 사용. server page는 서비스 직접 호출(force-dynamic), 변경만 /api POST. WorkOrderRow에 progress 없음 → 작업지시 화면은 상태 기반(진척 컬럼 제거, Stepper 상태 매핑).

**주의:** 조회 server component는 `export const dynamic = "force-dynamic"`(쿠키/DB 의존, 정적 프리렌더 방지). 미들웨어가 이미 /mockups·/kiosk 보호. 변경 API는 OPERATOR+ 가드(서버측)이며 UI도 403을 안내.

**범위:** R1-D로 R1(MVP) 완료 — 로그인→기준정보/생산 폐루프→Lot추적→재고→대시보드가 실데이터로 동작. 이후 R2(품질·설비·OEE·재고수불·알람 실데이터).
