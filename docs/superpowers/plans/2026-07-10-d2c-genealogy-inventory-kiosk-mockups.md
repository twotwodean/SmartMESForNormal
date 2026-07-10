# D2-C Lot추적·재고·현장키오스크 목업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.
> **검증 강화:** 각 화면은 빌드+타입 + **Next dev 실제 구동 + Playwright 실렌더**로 확인.

**Goal:** D1 컴포넌트로 나머지 3개 핵심화면(Lot 추적·재고 현황·현장 키오스크 실적)을 만들어 D2(핵심 화면 7종 목업)를 완료한다.

**Architecture:** `app/mockups/genealogy`(GenealogyTree + 노드 상세), `app/mockups/inventory`(DataTable + 경고 배너 + 수불 Drawer)는 목업 셸 안. **현장 키오스크는 크롬 없는 풀스크린**이라 `/mockups` 밖 `app/kiosk`에 두고(루트 레이아웃만 적용) 대형 터치 UI(KioskNumpad·대형 StatusPill·큰 등록 버튼)로 구성. 목업 셸 사이드바 푸터 링크를 `/kiosk`로 갱신. 색은 D0 토큰만.

**Tech Stack:** Next.js 14 App Router, D1 컴포넌트. (신규 의존성 없음)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `app/mockups/genealogy/page.tsx` | Lot 추적(GenealogyTree + 노드 상세 패널) |
| `app/mockups/inventory/page.tsx` | 재고 현황(DataTable + 경고 배너 + 수불 Drawer) |
| `app/kiosk/page.tsx` | 현장 키오스크 실적(크롬 없는 풀스크린 대형 터치) |
| `app/mockups/layout.tsx` | (수정) 사이드바 푸터 키오스크 링크 `/mockups/kiosk` → `/kiosk` |

스펙 §7 (Lot추적 GenealogyTree·재고 DataTable+수불드로어·현장 키오스크 풀스크린) 참조.

---

### Task 1: Lot 추적 화면

**Files:** Create `app/mockups/genealogy/page.tsx`.

- [ ] **Step 1: `app/mockups/genealogy/page.tsx`**
```tsx
"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GenealogyTree, countNodes, type GenealogyNode } from "@/components/ui/genealogy-tree";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";

const LOT_TREE: GenealogyNode = {
  id: "P1", label: "완제품 LOT-2600714", sub: "기어박스 GB-2500", tone: "ok",
  children: [
    { id: "S1", label: "반제품 LOT-2600712", sub: "샤프트 SUS-304", tone: "primary",
      children: [{ id: "R1", label: "원자재 LOT-2600701", sub: "환봉 Ø50", tone: "neutral" }] },
    { id: "S2", label: "반제품 LOT-2600713", sub: "하우징 M3", tone: "warn",
      children: [{ id: "R2", label: "원자재 LOT-2600705", sub: "알루미늄 6061", tone: "neutral" }] },
  ],
};

interface LotDetail {
  process: string;
  inspection: string;
  qty: string;
  date: string;
}
const DETAILS: Record<string, LotDetail> = {
  P1: { process: "포장 완료", inspection: "합격", qty: "120 EA", date: "2026-07-14" },
  S1: { process: "가공 완료", inspection: "합격", qty: "450 EA", date: "2026-07-12" },
  S2: { process: "성형 완료", inspection: "특채", qty: "800 EA", date: "2026-07-13" },
  R1: { process: "입고", inspection: "합격", qty: "1,200 kg", date: "2026-07-01" },
  R2: { process: "입고", inspection: "합격", qty: "300 kg", date: "2026-07-05" },
};

function findNode(node: GenealogyNode, id: string): GenealogyNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

export default function GenealogyPage() {
  const [sel, setSel] = React.useState<string>("S1");
  const node = findNode(LOT_TREE, sel);
  const detail = DETAILS[sel];

  return (
    <>
      <SectionHeader title="Lot 추적" description={`정·역 계보 · 총 ${countNodes(LOT_TREE)}개 Lot`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>계보 트리</CardTitle></CardHeader>
          <CardContent>
            <GenealogyTree root={LOT_TREE} selectedId={sel} onSelect={setSel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>LOT 상세</CardTitle></CardHeader>
          <CardContent>
            {node && detail ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <StatusPill tone={node.tone ?? "neutral"}>{detail.inspection}</StatusPill>
                  <span className="text-body-sm font-medium text-text">{node.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-body-sm">
                  <dt className="text-text-muted">품목</dt><dd className="text-text">{node.sub}</dd>
                  <dt className="text-text-muted">공정</dt><dd className="text-text">{detail.process}</dd>
                  <dt className="text-text-muted">수량</dt><dd className="num text-text">{detail.qty}</dd>
                  <dt className="text-text-muted">일자</dt><dd className="num text-text">{detail.date}</dd>
                </dl>
              </div>
            ) : (
              <EmptyState title="Lot을 선택하세요" description="트리에서 Lot 노드를 클릭하면 상세가 표시됩니다." />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: 검증** — Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/mockups/genealogy` 확인). Do NOT run long-running dev server.

- [ ] **Step 3: Commit**
```bash
git add app/mockups/genealogy/page.tsx
git commit -m "feat: Lot 추적 목업(GenealogyTree + 노드 상세 패널)"
```

---

### Task 2: 재고 현황 화면

**Files:** Create `app/mockups/inventory/page.tsx`.

- [ ] **Step 1: `app/mockups/inventory/page.tsx`**
```tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, stockTone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody,
} from "@/components/ui/drawer";
import { INVENTORY, type InventoryItem, type StockStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<StockStatus, string> = {
  NORMAL: "정상", BELOW: "미달", NEGATIVE: "음수",
};

// 정적 수불 이력(샘플)
const TXNS = [
  { date: "2026-07-09 14:10", type: "출고", qty: -120, ref: "WO-260709-014" },
  { date: "2026-07-09 09:32", type: "입고", qty: 500, ref: "GR-260709-002" },
  { date: "2026-07-08 16:05", type: "조정", qty: -8, ref: "ADJ-260708-001" },
];

const warnCount = INVENTORY.filter((i) => i.status !== "NORMAL").length;

export default function InventoryPage() {
  const [selected, setSelected] = React.useState<InventoryItem | null>(null);

  const columns: ColumnDef<InventoryItem>[] = [
    { accessorKey: "code", header: "품목코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "qty", header: "현재고", cell: (c) => {
      const v = c.getValue<number>();
      return <span className={`num ${v < 0 ? "text-crit font-semibold" : "text-text"}`}>{v.toLocaleString()}</span>;
    }},
    { accessorKey: "safety", header: "안전재고", cell: (c) => <span className="num text-text-muted">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "uom", header: "단위" },
    { accessorKey: "status", header: "상태", cell: (c) => {
      const s = c.getValue<StockStatus>();
      return <StatusPill tone={stockTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
    }},
    { id: "action", header: "", cell: (c) => (
      <Button variant="ghost" size="sm" onClick={() => setSelected(c.row.original)}>수불</Button>
    )},
  ];

  return (
    <>
      <SectionHeader title="재고 현황" description="품목별 현재고·안전재고 · 품목 클릭 시 수불 이력" />

      {warnCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
          ⚠ 재고 경고 {warnCount}건 — 안전재고 미달·음수 품목이 있습니다. 발주를 검토하세요.
        </div>
      )}

      <Card>
        <CardContent>
          <DataTable columns={columns} data={INVENTORY} enableFilter filterPlaceholder="품목 검색" />
        </CardContent>
      </Card>

      <Drawer open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{selected?.name} 수불 이력</DrawerTitle></DrawerHeader>
          <DrawerBody>
            {selected && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <StatusPill tone={stockTone(selected.status)}>{STATUS_LABEL[selected.status]}</StatusPill>
                  <span className="num text-body-sm text-text">현재고 {selected.qty.toLocaleString()} {selected.uom} / 안전 {selected.safety.toLocaleString()}</span>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {TXNS.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-body-sm">
                      <span className="num text-text-muted">{t.date}</span>
                      <span className="text-text">{t.type}</span>
                      <span className={`num font-semibold ${t.qty < 0 ? "text-crit" : "text-ok"}`}>{t.qty > 0 ? "+" : ""}{t.qty}</span>
                      <span className="font-mono text-caption text-text-faint">{t.ref}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: 검증** — Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/mockups/inventory` 확인). Do NOT run long-running dev server.

- [ ] **Step 3: Commit**
```bash
git add app/mockups/inventory/page.tsx
git commit -m "feat: 재고 현황 목업(DataTable + 경고 배너 + 수불 Drawer)"
```

---

### Task 3: 현장 키오스크 실적(크롬 없는 풀스크린)

**Files:** Create `app/kiosk/page.tsx`; Modify `app/mockups/layout.tsx`(푸터 링크).

- [ ] **Step 1: `app/mockups/layout.tsx` 푸터 링크 수정**
`footer={...}`의 `href="/mockups/kiosk"`를 `href="/kiosk"`로 변경(그 외 변경 없음).

- [ ] **Step 2: `app/kiosk/page.tsx`**
```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { KioskNumpad } from "@/components/ui/kiosk-numpad";
import { Button } from "@/components/ui/button";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { WORK_ORDERS, type WorkOrder, type WorkOrderStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};
const TARGETS = WORK_ORDERS.filter((w) => w.status === "RUNNING" || w.status === "WAITING");

function KioskEntry() {
  const { toast } = useToast();
  const [wo, setWo] = React.useState<WorkOrder>(TARGETS[0]);
  const [good, setGood] = React.useState(0);

  function register() {
    toast({ title: "실적 등록됨", description: `${wo.code} · 양품 ${good.toLocaleString()} EA`, tone: "ok" });
    setGood(0);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-bold text-text">현장 실적 등록</h1>
        <Link href="/mockups/manager" className="inline-flex items-center gap-1 text-body-sm text-text-muted hover:text-text">
          <ChevronLeft size={16} aria-hidden /> 관리자 화면
        </Link>
      </div>

      {/* 작업지시 선택 — 대형 터치 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TARGETS.map((w) => (
          <button
            key={w.code}
            type="button"
            onClick={() => setWo(w)}
            className={cn(
              "flex min-h-[72px] flex-col justify-center gap-1 rounded-xl border-2 px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              wo.code === w.code ? "border-primary bg-primary-soft" : "border-border bg-surface",
            )}
          >
            <span className="font-mono text-body-sm text-text-muted">{w.code}</span>
            <span className="text-subtitle font-semibold text-text">{w.item}</span>
          </button>
        ))}
      </div>

      {/* 선택 작업 + 대형 상태 */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
        <div>
          <div className="text-body-sm text-text-muted">선택된 작업지시</div>
          <div className="text-h3 font-bold text-text">{wo.item}</div>
        </div>
        <StatusPill tone={workOrderTone(wo.status)}>{STATUS_LABEL[wo.status]}</StatusPill>
      </div>

      {/* 대형 키패드 + 등록 */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-body-sm text-text-muted">양품 수량</span>
          <KioskNumpad aria-label="양품 수량" value={good} onChange={setGood} />
        </div>
        <Button size="lg" className="h-16 w-full px-10 text-[20px] sm:w-auto" onClick={register}>등록</Button>
      </div>
    </div>
  );
}

export default function KioskPage() {
  return (
    <ToastProvider>
      <KioskEntry />
    </ToastProvider>
  );
}
```

- [ ] **Step 3: 검증** — Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/kiosk` 라우트가 목업 셸 없이 생성되는지 확인). Do NOT run long-running dev server.

- [ ] **Step 4: Commit**
```bash
git add app/kiosk/page.tsx app/mockups/layout.tsx
git commit -m "feat: 현장 키오스크 실적 목업(크롬 없는 풀스크린 대형 터치) + 셸 푸터 링크"
```

---

### Task 4: 전체 검증 + 실렌더(Playwright) + D2 완료

- [ ] **Step 1: 게이트**
Run `npm test` (52 유지), `npx tsc --noEmit` (클린), `npm run build` (`/mockups/genealogy`, `/mockups/inventory`, `/kiosk` 라우트 확인).

- [ ] **Step 2: 실렌더 (Next dev + Playwright)**
Start `npm run dev` (port 3001). Drive with Playwright. 각 라우트 콘솔 에러 없음 확인.
- `/mockups/genealogy`: 계보 트리 노드들(완제품/반제품/원자재) 렌더. 다른 노드 클릭 → 우측 상세 패널 내용 변경(품목·공정·수량). 선택 노드 강조(bg-primary-soft).
- `/mockups/inventory`: 경고 배너 표시. DataTable에 5행, 음수 재고(윤활유) 값이 crit 색. "수불" 클릭 → Drawer 열려 수불 이력 표시.
- `/kiosk`: 사이드바/톱바 **없음**(크롬 없는 풀스크린) 확인 — AppShell 사이드바가 DOM에 없어야 함. 작업지시 대형 버튼 3개, KioskNumpad 숫자 클릭 시 표시값 증가, "등록" → Toast. "관리자 화면" 링크 존재.
Report ACTUAL observed values. Stop dev server(`npx kill-port 3001`, no bulk node kill). Delete scratch files.

- [ ] **Step 3:** 검증만이면 커밋 없음. 이슈 수정 시 별도 커밋 후 재확인.

---

## Self-Review 결과

**Spec 커버리지 (스펙 §7 — D2 7화면 완성):**
- Lot 추적(GenealogyTree + 상세) → Task 1 ✅
- 재고 현황(DataTable + 경고 배너 + 수불 Drawer) → Task 2 ✅
- 현장 키오스크(크롬 없는 풀스크린 대형 터치) → Task 3 ✅
- D2-A(경영·관리) + D2-B(작업지시·실적) 합쳐 **7개 화면 전부 완료**
- 실렌더 검증 → Task 4 ✅

**플레이스홀더 스캔:** 없음. 실제 코드 포함.

**타입 일관성:** `InventoryItem`/`StockStatus`/`WorkOrder` mock-data 재사용. `stockTone`(D1-A 후속 추가)·`GenealogyTree`/`countNodes`·`KioskNumpad`·`Drawer`·`DataTable` API가 실제 export와 일치. 키오스크는 `/mockups` 밖이라 셸 미적용(루트 레이아웃만) — 셸 푸터 링크도 `/kiosk`로 갱신.

**동시성:** 리뷰/실렌더와 구현 직렬. 검증 에이전트 체크아웃 금지.

**범위:** D2-C로 D2(핵심 화면 7종 하이파이 목업) 완료. 이후 R1(SRS MVP): Prisma+SQLite 스키마·seed·API + 실제 CRUD 연동.
