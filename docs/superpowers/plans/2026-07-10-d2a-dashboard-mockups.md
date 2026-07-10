# D2-A 대시보드 목업(경영·관리) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다(공유 작업 트리). 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.
> **검증 강화:** 각 화면은 빌드+타입뿐 아니라 **Next dev 앱을 실제 구동 + Playwright 실렌더**로 확인한다(정적 데이터 프로토타입).

**Goal:** D1 컴포넌트로 실제 Next.js App Router 라우트를 조립해 **탐색 가능한 정적 프로토타입**의 첫 두 화면(경영 대시보드·관리 대시보드)과 공유 목업 셸(사이드바 네비 + 톱바)·공유 목 데이터를 만든다.

**Architecture:** `app/mockups/` 라우트 그룹에 클라이언트 레이아웃(`usePathname`으로 활성 네비 표시)을 두고, AppShell + SidebarNav + Topbar(Breadcrumb·ConnectionBadge·Clock·ThemeToggle)로 감싼다. 화면은 D1 컴포넌트(KPITile·DataTable·Card·GaugeTile·StatusPill 등)를 정적 목 데이터(`lib/mock-data.ts`)로 조립한다. DataTable 등 훅 사용 컴포넌트를 쓰는 페이지는 `"use client"`. 색·간격은 D0 토큰만.

**Tech Stack:** Next.js 14 App Router, D1 컴포넌트 라이브러리, TS. (신규 외부 의존성 없음)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/mock-data.ts` | 공유 정적 목 데이터(작업지시·KPI·알람·라인·재고·Lot계보) + 타입 |
| `lib/mock-data.test.ts` | 목 데이터 무결성(합계·상태 유효성) 테스트 |
| `app/mockups/layout.tsx` | 목업 공유 셸(AppShell + 네비 활성 + 톱바) |
| `app/mockups/exec/page.tsx` | 경영 대시보드(지표·요약) |
| `app/mockups/manager/page.tsx` | 관리 대시보드(KPI + 작업지시 테이블 + 알람 + 라인 OEE) |

`docs/superpowers/specs/2026-07-09-mes-design-system-design.md` §7 참조. 나머지 화면: 작업지시·실적입력=D2-B, Lot추적·재고·현장키오스크=D2-C.

---

### Task 1: 공유 목 데이터 + 무결성 테스트

**Files:** Create `lib/mock-data.ts`, `lib/mock-data.test.ts`.

- [ ] **Step 1: 실패하는 테스트 (`lib/mock-data.test.ts`)**
```ts
import { describe, it, expect } from "vitest";
import { WORK_ORDERS, INVENTORY, workOrderTotals } from "@/lib/mock-data";

describe("mock-data", () => {
  it("작업지시가 존재하고 상태가 유효하다", () => {
    expect(WORK_ORDERS.length).toBeGreaterThan(0);
    for (const wo of WORK_ORDERS) {
      expect(["WAITING", "RUNNING", "DONE", "CANCELLED"]).toContain(wo.status);
      expect(wo.progress).toBeGreaterThanOrEqual(0);
      expect(wo.progress).toBeLessThanOrEqual(100);
    }
  });

  it("workOrderTotals가 상태별 개수를 집계한다", () => {
    const t = workOrderTotals(WORK_ORDERS);
    const sum = t.WAITING + t.RUNNING + t.DONE + t.CANCELLED;
    expect(sum).toBe(WORK_ORDERS.length);
  });

  it("재고 상태가 현재고/안전재고와 일치한다", () => {
    for (const it of INVENTORY) {
      const expected = it.qty < 0 ? "NEGATIVE" : it.qty < it.safety ? "BELOW" : "NORMAL";
      expect(it.status).toBe(expected);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run `npm test -- lib/mock-data.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: `lib/mock-data.ts`**
```ts
// 목업/프로토타입용 정적 데이터(단일 사업장·정적). R1에서 Prisma seed로 대체 예정.

export type WorkOrderStatus = "WAITING" | "RUNNING" | "DONE" | "CANCELLED";

export interface WorkOrder {
  code: string;
  item: string;
  qty: number;
  progress: number; // 0–100
  status: WorkOrderStatus;
  center: string;
}

export const WORK_ORDERS: WorkOrder[] = [
  { code: "WO-260709-014", item: "브라켓 ASSY (RF-L)", qty: 1200, progress: 72, status: "RUNNING", center: "CNC 1라인" },
  { code: "WO-260709-013", item: "하우징 커버 M3", qty: 800, progress: 100, status: "DONE", center: "프레스 2라인" },
  { code: "WO-260709-012", item: "샤프트 SUS-304", qty: 450, progress: 38, status: "RUNNING", center: "선반 3라인" },
  { code: "WO-260709-011", item: "기어박스 GB-2500", qty: 300, progress: 0, status: "WAITING", center: "조립 1라인" },
  { code: "WO-260709-010", item: "베어링 하우징", qty: 640, progress: 100, status: "DONE", center: "CNC 1라인" },
  { code: "WO-260709-009", item: "커넥터 하네스", qty: 2000, progress: 15, status: "CANCELLED", center: "—" },
];

export function workOrderTotals(list: WorkOrder[]): Record<WorkOrderStatus, number> {
  const acc: Record<WorkOrderStatus, number> = { WAITING: 0, RUNNING: 0, DONE: 0, CANCELLED: 0 };
  for (const wo of list) acc[wo.status] += 1;
  return acc;
}

export interface Kpi {
  key: string;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  direction?: "up" | "down";
  upIsGood?: boolean;
  tone: "primary" | "ok" | "warn" | "crit" | "info" | "neutral";
  spark?: number[];
  note?: string;
}

export const KPIS: Kpi[] = [
  { key: "plan", label: "계획 대비 실적", value: "92.4", unit: "%", delta: "3.1%p", direction: "up", tone: "primary", spark: [15, 12, 14, 8, 9, 4] },
  { key: "oee", label: "설비종합효율 OEE", value: "78.4", unit: "%", delta: "1.2%p", direction: "up", tone: "ok", spark: [10, 12, 7, 9, 6, 7] },
  { key: "ppm", label: "불량 PPM", value: "3,200", delta: "420", direction: "up", upIsGood: false, tone: "warn", spark: [14, 10, 12, 8, 10, 5] },
  { key: "stock", label: "재고 경고", value: "3", unit: "건", tone: "crit", note: "안전재고 미달 2 · 음수 1" },
  { key: "equip", label: "가동 설비", value: "14", unit: "/16", tone: "info", note: "정지 1 · 수리 1" },
];

export interface Alarm {
  id: string;
  tone: "crit" | "warn" | "info";
  title: string;
  message: string;
  ago: string;
}

export const ALARMS: Alarm[] = [
  { id: "a1", tone: "crit", title: "CNC-03 설비 정지", message: "주축 과부하 — 정비 요청 발행됨", ago: "4분 전" },
  { id: "a2", tone: "warn", title: "원자재 SUS-304 안전재고 미달", message: "현재고 180 / 안전 250", ago: "22분 전" },
  { id: "a3", tone: "info", title: "WO-260709-013 완료 입고", message: "하우징 커버 800 EA → 제품창고", ago: "31분 전" },
];

export interface LineOee {
  name: string;
  oee: number; // 0–100
  tone: "ok" | "warn" | "crit";
}

export const LINES: LineOee[] = [
  { name: "CNC 1라인", oee: 86, tone: "ok" },
  { name: "프레스 2라인", oee: 81, tone: "ok" },
  { name: "선반 3라인", oee: 64, tone: "warn" },
  { name: "조립 1라인", oee: 42, tone: "crit" },
];

export type StockStatus = "NORMAL" | "BELOW" | "NEGATIVE";

export interface InventoryItem {
  code: string;
  name: string;
  qty: number;
  safety: number;
  uom: string;
  status: StockStatus;
}

export const INVENTORY: InventoryItem[] = [
  { code: "RM-SUS304", name: "환봉 SUS-304 Ø50", qty: 180, safety: 250, uom: "kg", status: "BELOW" },
  { code: "RM-BOLT-M8", name: "볼트 M8x30", qty: 90, safety: 120, uom: "EA", status: "BELOW" },
  { code: "RM-OIL-32", name: "윤활유 VG32", qty: -12, safety: 20, uom: "L", status: "NEGATIVE" },
  { code: "SF-HOUS-M3", name: "하우징 커버 M3", qty: 640, safety: 200, uom: "EA", status: "NORMAL" },
  { code: "FG-GB2500", name: "기어박스 GB-2500", qty: 120, safety: 50, uom: "EA", status: "NORMAL" },
];
```

- [ ] **Step 4: 테스트 통과 확인** — Run `npm test -- lib/mock-data.test.ts` → PASS(3 passed).

- [ ] **Step 5: Commit**
```bash
git add lib/mock-data.ts lib/mock-data.test.ts
git commit -m "feat: 목업 공유 정적 데이터(작업지시·KPI·알람·라인·재고) + 무결성 테스트"
```

---

### Task 2: 목업 공유 셸 레이아웃

**Files:** Create `app/mockups/layout.tsx`.

- [ ] **Step 1: `app/mockups/layout.tsx`**
```tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Factory, ClipboardList, GitBranch, Boxes } from "lucide-react";
import { AppShell, SidebarNav, Topbar, type SideNavGroup } from "@/components/ui/app-shell";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { ConnectionBadge } from "@/components/ui/connection-badge";
import { Clock } from "@/components/ui/clock";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV: SideNavGroup[] = [
  { label: "대시보드", items: [
    { label: "경영 현황", href: "/mockups/exec", icon: LayoutDashboard },
    { label: "관리 현황", href: "/mockups/manager", icon: LayoutDashboard },
  ]},
  { label: "생산관리", items: [
    { label: "작업지시", href: "/mockups/work-orders", icon: Factory },
    { label: "생산실적", href: "/mockups/production", icon: ClipboardList },
  ]},
  { label: "품질·추적", items: [
    { label: "Lot 추적", href: "/mockups/genealogy", icon: GitBranch },
  ]},
  { label: "재고관리", items: [
    { label: "재고 현황", href: "/mockups/inventory", icon: Boxes },
  ]},
];

const CRUMB: Record<string, Crumb[]> = {
  "/mockups/exec": [{ label: "대시보드" }, { label: "경영 현황" }],
  "/mockups/manager": [{ label: "대시보드" }, { label: "관리 현황" }],
  "/mockups/work-orders": [{ label: "생산관리" }, { label: "작업지시" }],
  "/mockups/production": [{ label: "생산관리" }, { label: "생산실적" }],
  "/mockups/genealogy": [{ label: "품질·추적" }, { label: "Lot 추적" }],
  "/mockups/inventory": [{ label: "재고관리" }, { label: "재고 현황" }],
};

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const groups: SideNavGroup[] = NAV.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it, active: it.href === pathname })),
  }));
  const crumbs = CRUMB[pathname] ?? [{ label: "대시보드" }];

  return (
    <AppShell
      sidebar={
        <SidebarNav
          brand={<><span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-fg">▤</span> 스마트 MES</>}
          groups={groups}
          footer={<a href="/mockups/kiosk" className="block rounded-md border border-border px-3 py-2 text-center text-body-sm text-text-muted hover:text-text">🖥 현장 키오스크</a>}
        />
      }
      topbar={
        <Topbar right={<><ConnectionBadge status="connected" label="PLC 연결됨" /><Clock /><ThemeToggle /></>}>
          <Breadcrumb items={crumbs} />
        </Topbar>
      }
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 2: 검증** — Run `npx tsc --noEmit` (클린). (페이지가 아직 없으므로 라우트 방문 검증은 Task 3/4 이후.)

- [ ] **Step 3: Commit**
```bash
git add app/mockups/layout.tsx
git commit -m "feat: 목업 공유 셸(AppShell + 활성 네비 + 톱바)"
```

---

### Task 3: 관리 대시보드 (flagship)

**Files:** Create `app/mockups/manager/page.tsx`.

- [ ] **Step 1: `app/mockups/manager/page.tsx`**
```tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { KPIS, WORK_ORDERS, ALARMS, LINES, type WorkOrder } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

const columns: ColumnDef<WorkOrder>[] = [
  { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
  { accessorKey: "item", header: "품목" },
  { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  {
    accessorKey: "progress",
    header: "진척",
    cell: (c) => {
      const p = c.getValue<number>();
      const wo = c.row.original;
      return (
        <div className="flex items-center gap-2">
          <ProgressBar value={p} tone={workOrderTone(wo.status)} className="w-16" aria-label={`진척률 ${p}%`} />
          <span className="num text-caption text-text-muted">{p}%</span>
        </div>
      );
    },
  },
  { accessorKey: "status", header: "상태", cell: (c) => {
    const s = c.getValue<WorkOrder["status"]>();
    return <StatusPill tone={workOrderTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
  }},
  { accessorKey: "center", header: "작업장" },
];

export default function ManagerDashboard() {
  return (
    <>
      <SectionHeader title="생산 통합 현황" description="2공장 · 실시간 POP · 오늘 08:00–14:32 기준" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <KPITile
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            direction={k.direction}
            upIsGood={k.upIsGood}
            tone={k.tone}
            spark={k.spark}
            note={k.note}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>작업지시</CardTitle>
            <span className="ml-auto text-caption text-text-faint">총 {WORK_ORDERS.length}건</span>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={WORK_ORDERS} enableFilter filterPlaceholder="지시·품목 검색" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>알람 · 이벤트</CardTitle><span className="ml-auto text-caption text-text-faint">활성 {ALARMS.length}</span></CardHeader>
            <CardContent className="p-0">
              {ALARMS.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 border-t border-border px-4 py-3 first:border-t-0">
                  <span className={`mt-1.5 h-2 w-2 flex-none rounded-full bg-${a.tone}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-body-sm font-medium text-text">{a.title}</div>
                    <div className="text-caption text-text-muted">{a.message}</div>
                  </div>
                  <span className="ml-auto whitespace-nowrap text-caption text-text-faint">{a.ago}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>라인 가동률(OEE)</CardTitle><span className="ml-auto text-caption text-text-faint">{LINES.length}개 라인</span></CardHeader>
            <CardContent className="flex flex-wrap justify-around gap-3">
              {LINES.map((l) => (
                <GaugeTile key={l.name} label={l.name} value={l.oee} tone={l.tone} size={96} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
        ⚠ 재고 경고 3건 — SUS-304(180/250), 볼트 M8(90/120), 윤활유(−12) · 발주 검토 필요
      </div>
    </>
  );
}
```
> 참고: `bg-${a.tone}` 동적 클래스는 D0에서 추가한 tailwind safelist(`bg-primary/ok/warn/crit/info/neutral`)에 포함되어 purge 안전. `border-warn/30`은 임의 불투명도지만 Tailwind가 CSS 변수 색에 color-mix로 처리(3.4.x). 만약 `border-warn/30`이 렌더 안 되면 `border-warn`로 바꾼다.

- [ ] **Step 2: 검증 + Commit**
Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/mockups/manager` 라우트 생성 확인). Do NOT run long-running dev servers here (실렌더는 Task 5에서 일괄).
```bash
git add app/mockups/manager/page.tsx
git commit -m "feat: 관리 대시보드 목업(KPI + 작업지시 DataTable + 알람 + 라인 OEE)"
```

---

### Task 4: 경영 대시보드

**Files:** Create `app/mockups/exec/page.tsx`.

- [ ] **Step 1: `app/mockups/exec/page.tsx`**
```tsx
import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { KPIS, LINES, ALARMS } from "@/lib/mock-data";

export default function ExecDashboard() {
  return (
    <>
      <SectionHeader title="경영 현황" description="전사 요약 · 오늘 · 2공장 통합" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <KPITile
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            direction={k.direction}
            upIsGood={k.upIsGood}
            tone={k.tone}
            spark={k.spark}
            note={k.note}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>라인별 설비종합효율</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-4">
            {LINES.map((l) => (
              <GaugeTile key={l.name} label={l.name} value={l.oee} tone={l.tone} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>주요 알람 요약</CardTitle><span className="ml-auto text-caption text-text-faint">활성 {ALARMS.length}</span></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ALARMS.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <StatusPill tone={a.tone}>{a.tone === "crit" ? "이상" : a.tone === "warn" ? "주의" : "정보"}</StatusPill>
                <span className="text-body-sm text-text">{a.title}</span>
                <span className="ml-auto text-caption text-text-faint">{a.ago}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: 검증 + Commit**
Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/mockups/exec` 확인).
```bash
git add app/mockups/exec/page.tsx
git commit -m "feat: 경영 대시보드 목업(지표·라인 OEE·알람 요약)"
```

---

### Task 5: 전체 검증 + 실렌더(Playwright)

- [ ] **Step 1: 게이트**
Run `npm test` → 목 데이터 3 테스트 포함 통과(D1 49 + 3 = 52 passed). Run `npx tsc --noEmit` (클린). Run `npm run build` → `/mockups/exec`, `/mockups/manager` 정적/동적 라우트 생성 확인.

- [ ] **Step 2: 실렌더 검증 (Next dev + Playwright)**
Start Next dev in background: `npm run dev` (port 3001). Wait until ready. Drive with Playwright/Chromium:
- `http://localhost:3001/mockups/manager`:
  - 사이드바 네비 렌더, "관리 현황" 항목이 active(class에 `bg-primary-soft text-primary`) 확인.
  - KPI 타일 5개 렌더("계획 대비 실적" 등 텍스트), 작업지시 DataTable에 6행 렌더, 필터에 "샤프트" 입력 시 1행으로 좁혀지는지.
  - 알람 3건, 라인 게이지 4개("86%" 등) 렌더. 경고 배너 텍스트 표시. 가로 오버플로우 없음(scrollWidth ≤ clientWidth).
  - 다크/라이트 각각 확인(테마 토글 클릭 후 배경색 변화).
- `http://localhost:3001/mockups/exec`:
  - "경영 현황" active, KPI 5 + 게이지 4 + 알람 요약 렌더.
Report ACTUAL observed values. Stop dev server (`npx kill-port 3001`, do NOT bulk-kill node.exe). Delete scratch files.

- [ ] **Step 3: Commit** (검증만이면 커밋 없음; 실렌더 중 수정이 필요하면 별도 커밋 후 재확인)

---

## Self-Review 결과

**Spec 커버리지 (스펙 §7):**
- 경영 대시보드 → Task 4 ✅ / 관리 대시보드 → Task 3 ✅
- 공유 셸(사이드바 GNB + 톱바 + 브레드크럼) → Task 2 ✅
- 나머지 5화면(현장 키오스크·작업지시·실적입력·Lot추적·재고) → D2-B/C(범위 밖, 명시)
- 다크/라이트 + 실렌더 검증 → Task 5 ✅

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드 포함.

**타입 일관성:** `WorkOrder`/`InventoryItem` 등 타입은 mock-data.ts에서 정의·export → 페이지에서 재사용. `workOrderTone`(status-pill)·`KPITile`·`DataTable`·`GaugeTile` API가 D1 실제 export와 일치. 목업 레이아웃 네비 href가 D2-B/C 라우트를 미리 포함(해당 페이지 생성 전엔 404 — 진행상 정상, D2-C에서 kiosk 포함 완성).

**동시성:** 리뷰/실렌더 검증과 구현 직렬. 검증 에이전트는 체크아웃 금지.

**범위:** D2-A(공유 인프라 + 2 대시보드). 단독으로 빌드·실렌더 가능한 완결 단위. 이후 D2-B(작업지시·실적입력), D2-C(Lot추적·재고·현장키오스크).
