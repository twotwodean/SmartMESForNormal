# D2-B 작업지시·생산실적 목업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.
> **검증 강화:** 각 화면은 빌드+타입 + **Next dev 실제 구동 + Playwright 실렌더**로 확인.

**Goal:** D1 컴포넌트로 작업지시 화면(리스트/칸반 탭 + 상세 Drawer)과 생산실적 입력 화면(PC 폼: 작업지시 선택 + 수량 스테퍼 + 불량코드 + 등록 Toast)을 만든다.

**Architecture:** `app/mockups/work-orders`, `app/mockups/production` 라우트. work-orders는 Tabs(리스트=DataTable, 칸반=상태별 WorkOrderCard 컬럼) + 클릭 시 Drawer 상세(Stepper 공정 진행). production은 ToastProvider로 감싼 폼(좌 작업지시 선택, 우 NumberStepper·Select·등록 → Toast). 둘 다 `"use client"`. 목 데이터는 `lib/mock-data.ts` 재사용. 색은 D0 토큰만.

**Tech Stack:** Next.js 14 App Router, D1 컴포넌트. (신규 의존성 없음)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/mock-data.ts` | (수정) 불량코드 목록 `DEFECT_CODES` 추가 |
| `app/mockups/work-orders/page.tsx` | 작업지시(리스트/칸반 탭 + 상세 Drawer) |
| `app/mockups/production/page.tsx` | 생산실적 입력(PC 폼 + 등록 Toast) |

스펙 §7 (작업지시 3뷰 토글·우측 드로어 / 생산실적 PC 폼) 참조. 현장 키오스크 실적 입력은 D2-C.

---

### Task 1: 목 데이터에 불량코드 추가

**Files:** Modify `lib/mock-data.ts`.

- [ ] **Step 1: `lib/mock-data.ts` 끝에 추가**
```ts
export interface DefectCode {
  code: string;
  label: string;
}

export const DEFECT_CODES: DefectCode[] = [
  { code: "D-SCR", label: "스크래치" },
  { code: "D-DIM", label: "치수불량" },
  { code: "D-BUR", label: "버(Burr)" },
  { code: "D-CRK", label: "크랙" },
  { code: "D-ASM", label: "조립불량" },
];
```

- [ ] **Step 2: 검증** — Run `npm test -- lib/mock-data.test.ts` (기존 3 통과 유지), `npx tsc --noEmit` (클린).

- [ ] **Step 3: Commit**
```bash
git add lib/mock-data.ts
git commit -m "feat: 목 데이터에 불량코드 목록 추가"
```

---

### Task 2: 작업지시 화면 (리스트/칸반 탭 + 상세 Drawer)

**Files:** Create `app/mockups/work-orders/page.tsx`.

- [ ] **Step 1: `app/mockups/work-orders/page.tsx`**
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
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody,
} from "@/components/ui/drawer";
import { WORK_ORDERS, type WorkOrder, type WorkOrderStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

const KANBAN_COLS: { status: WorkOrderStatus; title: string }[] = [
  { status: "WAITING", title: "대기" },
  { status: "RUNNING", title: "진행" },
  { status: "DONE", title: "완료" },
];

const PROCESS_STEPS = ["절단", "가공", "조립", "검사", "포장"];
function progressToStep(progress: number): number {
  return Math.min(PROCESS_STEPS.length - 1, Math.max(0, Math.floor(progress / 20)));
}

export default function WorkOrdersPage() {
  const [selected, setSelected] = React.useState<WorkOrder | null>(null);
  const open = selected !== null;

  const columns: ColumnDef<WorkOrder>[] = [
    { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "item", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "status", header: "상태", cell: (c) => {
      const s = c.getValue<WorkOrderStatus>();
      return <StatusPill tone={workOrderTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
    }},
    { accessorKey: "center", header: "작업장" },
    { id: "action", header: "", cell: (c) => (
      <Button variant="ghost" size="sm" onClick={() => setSelected(c.row.original)}>상세</Button>
    )},
  ];

  return (
    <>
      <SectionHeader title="작업지시" description="리스트·칸반 뷰 · 클릭 시 상세" />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">리스트</TabsTrigger>
          <TabsTrigger value="kanban">칸반</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <DataTable columns={columns} data={WORK_ORDERS} enableFilter filterPlaceholder="지시·품목 검색" />
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {KANBAN_COLS.map((col) => {
              const items = WORK_ORDERS.filter((w) => w.status === col.status);
              return (
                <div key={col.status} className="rounded-lg border border-border bg-bg/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-body-sm font-semibold text-text">{col.title}</span>
                    <span className="num text-caption text-text-faint">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((w) => (
                      <WorkOrderCard
                        key={w.code}
                        code={w.code}
                        item={w.item}
                        qty={w.qty}
                        progress={w.progress}
                        statusLabel={STATUS_LABEL[w.status]}
                        tone={workOrderTone(w.status)}
                        center={w.center}
                        onClick={() => setSelected(w)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Drawer open={open} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{selected?.code} 상세</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            {selected && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <StatusPill tone={workOrderTone(selected.status)}>{STATUS_LABEL[selected.status]}</StatusPill>
                  <span className="text-body-sm text-text">{selected.item}</span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-body-sm">
                  <dt className="text-text-muted">수량</dt><dd className="num text-text">{selected.qty.toLocaleString()} EA</dd>
                  <dt className="text-text-muted">작업장</dt><dd className="text-text">{selected.center}</dd>
                  <dt className="text-text-muted">진척</dt><dd className="num text-text">{selected.progress}%</dd>
                </dl>
                <div>
                  <div className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-faint">공정 진행</div>
                  <Stepper steps={PROCESS_STEPS} current={progressToStep(selected.progress)} />
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

- [ ] **Step 2: 검증**
Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/mockups/work-orders` 라우트 확인). Do NOT run long-running dev server.

- [ ] **Step 3: Commit**
```bash
git add app/mockups/work-orders/page.tsx
git commit -m "feat: 작업지시 목업(리스트/칸반 탭 + 상세 Drawer + 공정 Stepper)"
```

---

### Task 3: 생산실적 입력 화면 (PC 폼 + 등록 Toast)

**Files:** Create `app/mockups/production/page.tsx`.

- [ ] **Step 1: `app/mockups/production/page.tsx`**
```tsx
"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Button } from "@/components/ui/button";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { WORK_ORDERS, DEFECT_CODES, type WorkOrder, type WorkOrderStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

// 실적 등록 대상: 진행/대기 작업지시
const TARGETS = WORK_ORDERS.filter((w) => w.status === "RUNNING" || w.status === "WAITING");

function ProductionForm() {
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<WorkOrder>(TARGETS[0]);
  const [good, setGood] = React.useState(0);
  const [defect, setDefect] = React.useState(0);
  const [defectCode, setDefectCode] = React.useState<string>("");
  const [downtime, setDowntime] = React.useState(0);

  function submit() {
    toast({
      title: "실적 등록됨",
      description: `${selected.code} · 양품 ${good.toLocaleString()} / 불량 ${defect.toLocaleString()}`,
      tone: "ok",
    });
    setGood(0);
    setDefect(0);
    setDefectCode("");
    setDowntime(0);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* 좌: 작업지시 선택 */}
      <Card>
        <CardHeader><CardTitle>작업지시 선택</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          {TARGETS.map((w) => (
            <button
              key={w.code}
              type="button"
              onClick={() => setSelected(w)}
              className={cn(
                "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                selected.code === w.code ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-elevated",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-caption text-text-muted">{w.code}</span>
                <StatusPill tone={workOrderTone(w.status)}>{STATUS_LABEL[w.status]}</StatusPill>
              </div>
              <span className="text-body-sm text-text">{w.item}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 우: 실적 폼 */}
      <Card>
        <CardHeader><CardTitle>실적 입력 — {selected.code}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-8">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">양품 수량</span>
              <NumberStepper aria-label="양품 수량" value={good} onValueChange={setGood} min={0} max={99999} step={10} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">불량 수량</span>
              <NumberStepper aria-label="불량 수량" value={defect} onValueChange={setDefect} min={0} max={99999} step={1} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">비가동(분)</span>
              <NumberStepper aria-label="비가동 분" value={downtime} onValueChange={setDowntime} min={0} max={480} step={5} />
            </label>
          </div>

          <label className="flex max-w-xs flex-col gap-1.5">
            <span className="text-body-sm text-text-muted">불량코드</span>
            <Select value={defectCode} onValueChange={setDefectCode}>
              <SelectTrigger><SelectValue placeholder="불량코드 선택" /></SelectTrigger>
              <SelectContent>
                {DEFECT_CODES.map((d) => (
                  <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setGood(0); setDefect(0); setDefectCode(""); setDowntime(0); }}>초기화</Button>
            <Button onClick={submit}>실적 등록</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductionPage() {
  return (
    <ToastProvider>
      <SectionHeader title="생산실적 입력" description="작업지시 선택 후 양품·불량·비가동 등록" />
      <ProductionForm />
    </ToastProvider>
  );
}
```

- [ ] **Step 2: 검증**
Run `npx tsc --noEmit` (클린), `npm run build` (성공 — `/mockups/production` 라우트 확인). Do NOT run long-running dev server.

- [ ] **Step 3: Commit**
```bash
git add app/mockups/production/page.tsx
git commit -m "feat: 생산실적 입력 목업(작업지시 선택 + 수량 스테퍼 + 불량코드 + 등록 Toast)"
```

---

### Task 4: 전체 검증 + 실렌더(Playwright)

- [ ] **Step 1: 게이트**
Run `npm test` (52 유지), `npx tsc --noEmit` (클린), `npm run build` (`/mockups/work-orders`, `/mockups/production` 라우트 확인).

- [ ] **Step 2: 실렌더 (Next dev + Playwright)**
Start `npm run dev` (port 3001). Drive with Playwright:
- `/mockups/work-orders`:
  - 콘솔 에러 없음. 리스트 탭 DataTable 6행. "칸반" 탭 클릭 → 3개 컬럼(대기/진행/완료)에 WorkOrderCard 렌더(진행 컬럼에 카드 존재).
  - 카드/행 "상세" 클릭 → Drawer가 우측에서 열리고 제목에 지시번호, 공정 Stepper 렌더. Escape로 닫힘.
- `/mockups/production`:
  - 콘솔 에러 없음. 좌측 작업지시 목록에서 항목 클릭 시 선택(강조) 변경. 양품 NumberStepper ＋ 클릭 시 값 증가. "실적 등록" 클릭 → Toast "실적 등록됨" 표시(우하단), 폼 초기화.
Report ACTUAL observed values. Stop dev server (`npx kill-port 3001`; no bulk node kill). Delete scratch files.

- [ ] **Step 3:** 검증만이면 커밋 없음. 이슈 수정 시 별도 커밋 후 재확인.

---

## Self-Review 결과

**Spec 커버리지 (스펙 §7):**
- 작업지시(리스트/칸반 토글 + 우측 드로어 상세) → Task 2 ✅ (간트는 후속, 명시)
- 생산실적 입력(PC: 좌 작업지시 선택 + 우 실적 폼) → Task 3 ✅ (키오스크 실적은 D2-C)
- 실렌더 검증 → Task 4 ✅

**플레이스홀더 스캔:** 없음. 실제 코드 포함.

**타입 일관성:** `WorkOrder`/`WorkOrderStatus`/`DefectCode` mock-data에서 재사용. Tabs·DataTable·WorkOrderCard·Drawer·Stepper·NumberStepper·Select·ToastProvider/useToast API가 D1 실제 export와 일치. `progressToStep`은 순수 계산(간단해 별도 테스트 생략 — Stepper 자체는 D1에서 테스트됨).

**동시성:** 리뷰/실렌더와 구현 직렬. 검증 에이전트 체크아웃 금지.

**범위:** D2-B(작업지시·실적입력). 단독 빌드·실렌더 가능. 이후 D2-C(Lot추적·재고·현장키오스크)로 D2 완료.
