# D1-B 데이터(Data) 컴포넌트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MES 조회·모니터링의 핵심인 데이터 컴포넌트(Table 프리미티브·DataTable·KPITile·Sparkline·ProgressBar·EmptyState·Skeleton·DatePicker)를 D0 토큰·D1-A 기반 위에 구축하고, 각 컴포넌트를 Storybook 스토리와 로직/동작 테스트로 검증한다. 아울러 D0 리뷰에서 이월된 토큰↔CSS 교차 정합성 테스트를 추가한다.

**Architecture:** DataTable은 `@tanstack/react-table`(headless)를 정렬·필터·페이지네이션·행선택 엔진으로 사용하고, 표 마크업은 우리 토큰으로 스타일링한 Table 프리미티브(components/ui/table.tsx)로 렌더한다. 밀도(dense)·고정헤더(sticky)는 props로 제어한다. DatePicker는 react-day-picker 캘린더를 Radix Popover에 담고 date-fns로 포맷한다. Sparkline은 의존성 없는 인라인 SVG. 모든 색·간격은 D0 토큰만 사용한다.

**Tech Stack:** React 18 + TS, @tanstack/react-table v8, react-day-picker v8 + date-fns v3, @radix-ui/react-popover, lucide-react, Vitest + @testing-library/react (jsdom), Storybook 8.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/tokens-css-sync.test.ts` | design-tokens.ts ↔ globals.css hex 값 교차 정합성(드리프트 방지) |
| `components/ui/table.tsx` | Table/TableHeader/TableBody/TableRow/TableHead/TableCell 프리미티브(조밀·고정헤더) |
| `components/ui/data-table.tsx` | DataTable(정렬·필터·페이지·행선택, tanstack) |
| `components/ui/data-table.test.tsx` | DataTable 정렬·필터·행선택 동작 테스트 |
| `components/ui/sparkline.tsx` | Sparkline(인라인 SVG) + 순수 `sparklinePoints()` |
| `components/ui/sparkline.test.tsx` | `sparklinePoints()` 좌표 계산 테스트 |
| `components/ui/kpi-tile.tsx` | KPITile(수치+델타+스파크라인+스트라이프) |
| `components/ui/progress-bar.tsx` | ProgressBar(값 기반, tone) |
| `components/ui/empty-state.tsx` | EmptyState(아이콘+메시지+액션) |
| `components/ui/skeleton.tsx` | Skeleton(로딩 플레이스홀더) |
| `components/ui/date-picker.tsx` | DatePicker(Popover + react-day-picker) |
| `components/ui/index.ts` | (수정) 배럴 export 확장 |
| `stories/*.stories.tsx` | 컴포넌트별 스토리 |

`docs/superpowers/specs/2026-07-09-mes-design-system-design.md` §6.2 참조.

---

### Task 1: 의존성 + 토큰↔CSS 교차 정합성 테스트 (D0 이월)

**Files:**
- Test: `lib/tokens-css-sync.test.ts`
- Modify: `package.json` (deps)

- [ ] **Step 1: 의존성 설치**

Run (bash):
```bash
npm install @tanstack/react-table@8.19.3 @radix-ui/react-popover@1.1.1 react-day-picker@8.10.1 date-fns@3.6.0
```
Expected: 설치 완료. 버전 해석 실패 시 major.minor 유지·근접 패치 허용, 대체 시 보고.

- [ ] **Step 2: 실패 가능성 확인용 테스트 작성 (`lib/tokens-css-sync.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SEMANTIC_COLORS, NEUTRAL_COLORS } from "@/lib/design-tokens";

const css = fs.readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

/** globals.css에서 특정 셀렉터 블록의 본문을 추출 */
function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`셀렉터 블록을 찾지 못함: ${selector}`);
  return m[1];
}

/** 블록에서 CSS 변수의 hex 값 추출(대문자 정규화) */
function cssVar(body: string, name: string): string {
  const m = body.match(new RegExp("--" + name + ":\\s*(#[0-9A-Fa-f]{6})"));
  if (!m) throw new Error(`변수를 찾지 못함: --${name}`);
  return m[1].toUpperCase();
}

describe("토큰 ↔ globals.css 정합성", () => {
  const darkBody = block(':root[data-theme="dark"]');
  const lightBody = block(':root[data-theme="light"]');

  it("의미색이 다크/라이트 블록과 일치한다", () => {
    for (const [key, val] of Object.entries(SEMANTIC_COLORS)) {
      expect(cssVar(darkBody, key)).toBe(val.dark.toUpperCase());
      expect(cssVar(lightBody, key)).toBe(val.light.toUpperCase());
    }
  });

  it("중립색(bg/surface/elevated/border)이 일치한다", () => {
    const keys = ["bg", "surface", "elevated", "border"] as const;
    for (const k of keys) {
      expect(cssVar(darkBody, k)).toBe(NEUTRAL_COLORS.dark[k].toUpperCase());
      expect(cssVar(lightBody, k)).toBe(NEUTRAL_COLORS.light[k].toUpperCase());
    }
  });
});
```

- [ ] **Step 3: 테스트 실행 (통과 확인)**

Run: `npm test -- lib/tokens-css-sync.test.ts`
Expected: PASS (2 passed). 만약 실패하면 이는 실제 드리프트를 잡은 것이므로 STOP하고 BLOCKED로 어떤 변수가 어긋났는지 보고(토큰/CSS 중 무엇이 정답인지는 판단 대상 — 우선 보고).

- [ ] **Step 4: Commit**

```bash
git add lib/tokens-css-sync.test.ts package.json package-lock.json
git commit -m "test: 토큰↔globals.css 교차 정합성 + D1-B 데이터 계층 의존성"
```

---

### Task 2: Table 프리미티브

**Files:**
- Create: `components/ui/table.tsx`
- Create: `stories/table.stories.tsx`

- [ ] **Step 1: `components/ui/table.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full border-collapse text-body-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn(className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />,
);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b border-border transition hover:bg-elevated data-[state=selected]:bg-primary-soft", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-2.5 py-2 text-left align-middle text-label font-semibold uppercase tracking-wide text-text-faint",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-2.5 py-1.5 align-middle text-text", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";
```

- [ ] **Step 2: `stories/table.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";

const meta: Meta = { title: "Data/Table" };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>지시번호</TableHead>
          <TableHead>품목</TableHead>
          <TableHead>수량</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-mono text-caption">WO-260709-014</TableCell>
          <TableCell>브라켓 ASSY (RF-L)</TableCell>
          <TableCell className="num">1,200</TableCell>
          <TableCell><StatusPill tone="primary">진행</StatusPill></TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-mono text-caption">WO-260709-013</TableCell>
          <TableCell>하우징 커버 M3</TableCell>
          <TableCell className="num">800</TableCell>
          <TableCell><StatusPill tone="ok">완료</StatusPill></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
```

- [ ] **Step 3: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/table.tsx stories/table.stories.tsx
git commit -m "feat: Table 프리미티브(조밀·고정헤더 대응) + 스토리"
```

---

### Task 3: DataTable (tanstack) — 동작 테스트 포함

**Files:**
- Create: `components/ui/data-table.tsx`
- Test: `components/ui/data-table.test.tsx`
- Create: `stories/data-table.stories.tsx`

- [ ] **Step 1: 실패하는 테스트 (`components/ui/data-table.test.tsx`)**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

interface Row { code: string; qty: number; }
const columns: ColumnDef<Row>[] = [
  { accessorKey: "code", header: "지시번호" },
  { accessorKey: "qty", header: "수량" },
];
const data: Row[] = [
  { code: "WO-3", qty: 300 },
  { code: "WO-1", qty: 100 },
  { code: "WO-2", qty: 200 },
];

function bodyRows() {
  const table = screen.getByRole("table");
  const bodies = within(table).getAllByRole("rowgroup");
  // rowgroup[0]=thead, [1]=tbody
  return within(bodies[1]).getAllByRole("row");
}

describe("DataTable", () => {
  it("데이터 행을 렌더한다", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(bodyRows()).toHaveLength(3);
  });

  it("헤더 클릭으로 정렬한다", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);
    await user.click(screen.getByRole("button", { name: /지시번호/ }));
    const first = within(bodyRows()[0]).getAllByRole("cell")[0];
    expect(first).toHaveTextContent("WO-1"); // 오름차순 정렬
  });

  it("전역 필터로 행을 좁힌다", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableFilter filterPlaceholder="검색" />);
    await user.type(screen.getByPlaceholderText("검색"), "WO-2");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("WO-2");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- components/ui/data-table.test.tsx`
Expected: FAIL — cannot resolve import "@/components/ui/data-table".

- [ ] **Step 3: `components/ui/data-table.tsx`**

```tsx
"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableFilter?: boolean;
  filterPlaceholder?: string;
  enablePagination?: boolean;
  pageSize?: number;
  stickyHeader?: boolean;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableFilter = false,
  filterPlaceholder = "검색…",
  enablePagination = false,
  pageSize = 10,
  stickyHeader = false,
  emptyMessage = "데이터가 없습니다.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    initialState: enablePagination ? { pagination: { pageSize } } : undefined,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-3">
      {enableFilter && (
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={filterPlaceholder}
          className="max-w-xs"
        />
      )}

      <div className={cn("rounded-lg border border-border", stickyHeader && "max-h-[480px] overflow-y-auto")}>
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-surface")}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ChevronUp size={13} aria-hidden />
                          ) : sorted === "desc" ? (
                            <ChevronDown size={13} aria-hidden />
                          ) : (
                            <ChevronsUpDown size={13} className="text-text-faint" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-text-muted">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-muted num">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 페이지 · 총 {table.getFilteredRowModel().rows.length}건
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              이전
            </Button>
            <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- components/ui/data-table.test.tsx`
Expected: PASS (3 passed)

- [ ] **Step 5: `stories/data-table.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";

interface WO {
  code: string;
  item: string;
  qty: number;
  status: "WAITING" | "RUNNING" | "DONE" | "CANCELLED";
  center: string;
}

const columns: ColumnDef<WO>[] = [
  { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
  { accessorKey: "item", header: "품목" },
  { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  {
    accessorKey: "status",
    header: "상태",
    cell: (c) => {
      const s = c.getValue<WO["status"]>();
      const label = { WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소" }[s];
      return <StatusPill tone={workOrderTone(s)}>{label}</StatusPill>;
    },
  },
  { accessorKey: "center", header: "작업장" },
];

const data: WO[] = [
  { code: "WO-260709-014", item: "브라켓 ASSY (RF-L)", qty: 1200, status: "RUNNING", center: "CNC 1라인" },
  { code: "WO-260709-013", item: "하우징 커버 M3", qty: 800, status: "DONE", center: "프레스 2라인" },
  { code: "WO-260709-012", item: "샤프트 SUS-304", qty: 450, status: "RUNNING", center: "선반 3라인" },
  { code: "WO-260709-011", item: "기어박스 GB-2500", qty: 300, status: "WAITING", center: "조립 1라인" },
  { code: "WO-260709-009", item: "커넥터 하네스", qty: 2000, status: "CANCELLED", center: "—" },
];

const meta: Meta<typeof DataTable<WO, unknown>> = { title: "Data/DataTable", component: DataTable };
export default meta;
type Story = StoryObj<typeof DataTable<WO, unknown>>;

export const Basic: Story = { args: { columns, data } };
export const Sortable: Story = { args: { columns, data, enableFilter: true, filterPlaceholder: "지시·품목 검색" } };
export const Paginated: Story = { args: { columns, data, enablePagination: true, pageSize: 3, enableFilter: true } };
export const Empty: Story = { args: { columns, data: [], emptyMessage: "작업지시가 없습니다." } };
```

- [ ] **Step 6: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/data-table.tsx components/ui/data-table.test.tsx stories/data-table.stories.tsx
git commit -m "feat: DataTable(tanstack 정렬·필터·페이지·행선택) + 테스트/스토리"
```

---

### Task 4: Sparkline + KPITile — Sparkline 로직 테스트 포함

**Files:**
- Create: `components/ui/sparkline.tsx`, `components/ui/kpi-tile.tsx`
- Test: `components/ui/sparkline.test.tsx`
- Create: `stories/kpi-tile.stories.tsx`

- [ ] **Step 1: 실패하는 테스트 (`components/ui/sparkline.test.tsx`)**

```tsx
import { describe, it, expect } from "vitest";
import { sparklinePoints } from "@/components/ui/sparkline";

describe("sparklinePoints", () => {
  it("값들을 width/height에 맞는 좌표 문자열로 변환한다", () => {
    const pts = sparklinePoints([0, 5, 10], { width: 20, height: 10 });
    // x: 0,10,20 / y(반전): 10,5,0
    expect(pts).toBe("0,10 10,5 20,0");
  });

  it("모든 값이 같으면 중앙선으로 그린다", () => {
    const pts = sparklinePoints([4, 4, 4], { width: 20, height: 10 });
    expect(pts).toBe("0,5 10,5 20,5");
  });

  it("값이 1개 이하면 빈 문자열", () => {
    expect(sparklinePoints([7], { width: 20, height: 10 })).toBe("");
    expect(sparklinePoints([], { width: 20, height: 10 })).toBe("");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- components/ui/sparkline.test.tsx`
Expected: FAIL — cannot resolve import.

- [ ] **Step 3: `components/ui/sparkline.tsx`**

```tsx
import * as React from "react";

interface SparkOpts {
  width: number;
  height: number;
}

/** 값 배열을 SVG polyline points 문자열로 변환(y축 반전). 값이 2개 미만이면 빈 문자열. */
export function sparklinePoints(values: number[], { width, height }: SparkOpts): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = span === 0 ? height / 2 : Math.round(height - ((v - min) / span) * height);
      return `${x},${y}`;
    })
    .join(" ");
}

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** stroke 색 (CSS 색/변수). 기본 currentColor */
  stroke?: string;
}

export function Sparkline({ values, width = 52, height = 20, className, stroke = "currentColor" }: SparklineProps) {
  const points = sparklinePoints(values, { width, height });
  if (!points) return null;
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}
```

- [ ] **Step 4: `components/ui/kpi-tile.tsx`**

```tsx
import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import type { Tone } from "@/components/ui/status-pill";

const STRIPE: Record<Tone, string> = {
  primary: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-neutral",
};

const SPARK: Record<Tone, string> = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  info: "var(--info)",
  neutral: "var(--neutral)",
};

export interface KPITileProps {
  label: string;
  value: string;
  unit?: string;
  /** 델타 텍스트(예: "3.1%p"). 부호는 direction으로 표현 */
  delta?: string;
  direction?: "up" | "down";
  /** 상승이 좋은 지표인가(색 결정). 기본 true */
  upIsGood?: boolean;
  tone?: Tone;
  spark?: number[];
  note?: string;
}

export function KPITile({
  label,
  value,
  unit,
  delta,
  direction,
  upIsGood = true,
  tone = "primary",
  spark,
  note,
}: KPITileProps) {
  const positive = direction === "up" ? upIsGood : direction === "down" ? !upIsGood : true;
  const deltaColor = delta && direction ? (positive ? "text-ok" : "text-crit") : "text-text-muted";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-card">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", STRIPE[tone])} aria-hidden />
      <div className="text-caption text-text-muted">{label}</div>
      <div className="mt-1.5 text-[27px] font-bold leading-none num">
        {value}
        {unit && <span className="ml-0.5 text-body font-semibold text-text-muted">{unit}</span>}
      </div>
      {delta && (
        <div className={cn("mt-1 inline-flex items-center gap-0.5 text-caption font-semibold", deltaColor)}>
          {direction === "up" && <ArrowUp size={12} aria-hidden />}
          {direction === "down" && <ArrowDown size={12} aria-hidden />}
          <span className="num">{delta}</span>
        </div>
      )}
      {note && <div className="mt-1 text-caption text-text-muted">{note}</div>}
      {spark && spark.length > 1 && (
        <div className="absolute bottom-2.5 right-3">
          <Sparkline values={spark} stroke={SPARK[tone]} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- components/ui/sparkline.test.tsx`
Expected: PASS (3 passed)

- [ ] **Step 6: `stories/kpi-tile.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { KPITile } from "@/components/ui/kpi-tile";

const meta: Meta<typeof KPITile> = { title: "Data/KPITile", component: KPITile };
export default meta;
type Story = StoryObj<typeof KPITile>;

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 220px)", gap: 12 }}>
      <KPITile label="계획 대비 실적" value="92.4" unit="%" delta="3.1%p" direction="up" tone="primary" spark={[15, 12, 14, 8, 9, 4]} />
      <KPITile label="설비종합효율 OEE" value="78.4" unit="%" delta="1.2%p" direction="up" tone="ok" spark={[10, 12, 7, 9, 6, 7]} />
      <KPITile label="불량 PPM" value="3,200" delta="420" direction="up" upIsGood={false} tone="warn" spark={[14, 10, 12, 8, 10, 5]} />
      <KPITile label="재고 경고" value="3" unit="건" note="안전재고 미달 2 · 음수 1" tone="crit" />
      <KPITile label="가동 설비" value="14" unit="/16" note="정지 1 · 수리 1" tone="info" />
    </div>
  ),
};
```

- [ ] **Step 7: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/sparkline.tsx components/ui/sparkline.test.tsx components/ui/kpi-tile.tsx stories/kpi-tile.stories.tsx
git commit -m "feat: Sparkline(좌표 로직 테스트) + KPITile(수치·델타·스파크라인) + 스토리"
```

---

### Task 5: ProgressBar + EmptyState + Skeleton

**Files:**
- Create: `components/ui/progress-bar.tsx`, `components/ui/empty-state.tsx`, `components/ui/skeleton.tsx`
- Create: `stories/feedback.stories.tsx`

- [ ] **Step 1: `components/ui/progress-bar.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

const FILL: Record<Tone, string> = {
  primary: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-neutral",
};

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: Tone;
  className?: string;
  "aria-label"?: string;
}

export function ProgressBar({ value, tone = "primary", className, "aria-label": ariaLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-1.5 w-full overflow-hidden rounded bg-elevated", className)}
    >
      <div className={cn("h-full rounded transition-[width]", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 2: `components/ui/empty-state.tsx`**

```tsx
import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center", className)}>
      <Icon size={32} className="text-text-faint" aria-hidden />
      <div className="text-body font-semibold text-text">{title}</div>
      {description && <div className="max-w-sm text-body-sm text-text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: `components/ui/skeleton.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-elevated", className)} aria-hidden {...props} />;
}
```

- [ ] **Step 4: `stories/feedback.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PackageSearch } from "lucide-react";

const meta: Meta = { title: "Data/Feedback" };
export default meta;
type Story = StoryObj;

export const Progress: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 260 }}>
      <ProgressBar value={72} tone="primary" aria-label="진척률 72%" />
      <ProgressBar value={100} tone="ok" aria-label="완료" />
      <ProgressBar value={42} tone="crit" aria-label="가동률 42%" />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ width: 420 }}>
      <EmptyState
        icon={PackageSearch}
        title="작업지시가 없습니다"
        description="선택한 기간·작업장에 해당하는 작업지시가 없습니다. 조건을 바꾸거나 새 지시를 발행하세요."
        action={<Button size="sm">작업지시 발행</Button>}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, width: 320 }}>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};
```

- [ ] **Step 5: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/progress-bar.tsx components/ui/empty-state.tsx components/ui/skeleton.tsx stories/feedback.stories.tsx
git commit -m "feat: ProgressBar + EmptyState + Skeleton + 스토리"
```

---

### Task 6: DatePicker (Popover + react-day-picker)

**Files:**
- Create: `components/ui/popover.tsx`, `components/ui/date-picker.tsx`
- Create: `stories/date-picker.stories.tsx`

- [ ] **Step 1: `components/ui/popover.tsx` (Radix Popover 리테마)**

```tsx
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn("z-50 rounded-lg border border-border bg-elevated p-3 text-text shadow-modal", className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";
```

- [ ] **Step 2: `components/ui/date-picker.tsx`**

```tsx
"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "날짜 선택", "aria-label": ariaLabel, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "inline-flex h-9 w-[200px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-body-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
            value ? "text-text" : "text-text-faint",
          )}
        >
          <CalendarIcon size={16} className="text-text-faint" aria-hidden />
          {value ? format(value, "yyyy-MM-dd") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <DayPicker
          mode="single"
          locale={ko}
          selected={value}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
          showOutsideDays
          components={{
            IconLeft: () => <ChevronLeft size={16} />,
            IconRight: () => <ChevronRight size={16} />,
          }}
          classNames={{
            months: "flex",
            month: "space-y-2",
            caption: "flex items-center justify-between px-1 pb-1",
            caption_label: "text-body-sm font-semibold text-text",
            nav: "flex items-center gap-1",
            nav_button: "inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            table: "border-collapse",
            head_row: "flex",
            head_cell: "w-8 text-caption font-medium text-text-faint",
            row: "flex",
            cell: "p-0",
            day: "inline-flex h-8 w-8 items-center justify-center rounded-md text-body-sm text-text hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            day_selected: "bg-primary text-primary-fg hover:bg-primary",
            day_today: "border border-border",
            day_outside: "text-text-faint",
            day_disabled: "opacity-40",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 3: `stories/date-picker.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { DatePicker } from "@/components/ui/date-picker";

const meta: Meta<typeof DatePicker> = { title: "Data/DatePicker", component: DatePicker };
export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>();
    return <DatePicker value={date} onChange={setDate} aria-label="생산일자" />;
  },
};

export const Preset: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 6, 9));
    return <DatePicker value={date} onChange={setDate} aria-label="생산일자" />;
  },
};
```

- [ ] **Step 4: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)

> react-day-picker v8은 자체 CSS를 요구하지 않도록 `classNames`를 완전 지정했다. 만약 빌드/타입 에러(예: `components` prop의 IconLeft/IconRight 시그니처)가 나면, 해당 버전의 타입에 맞춰 최소 수정 후 무엇을 바꿨는지 보고하라. date-fns `ko` 로케일 import 경로가 다르면(`date-fns/locale/ko`) 맞춰 수정하라.

```bash
git add components/ui/popover.tsx components/ui/date-picker.tsx stories/date-picker.stories.tsx
git commit -m "feat: DatePicker(Popover + react-day-picker, 토큰 리테마) + 스토리"
```

---

### Task 7: 배럴 export 확장 + 전체 검증

**Files:**
- Modify: `components/ui/index.ts`

- [ ] **Step 1: `components/ui/index.ts`에 데이터 계층 export 추가**

기존 export 아래에 추가:
```ts
export {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "./table";
export { DataTable, type DataTableProps } from "./data-table";
export { Sparkline, sparklinePoints, type SparklineProps } from "./sparkline";
export { KPITile, type KPITileProps } from "./kpi-tile";
export { ProgressBar, type ProgressBarProps } from "./progress-bar";
export { EmptyState, type EmptyStateProps } from "./empty-state";
export { Skeleton } from "./skeleton";
export { Popover, PopoverTrigger, PopoverContent } from "./popover";
export { DatePicker, type DatePickerProps } from "./date-picker";
```
각 export명이 실제 파일 export와 일치하는지 확인 후 확정(불일치 시 배럴을 실제에 맞춰 수정하고 보고).

- [ ] **Step 2: 전체 검증**

Run: `npm test`
Expected: 모든 테스트 통과 (D1-A 20 + tokens-css-sync 2 + data-table 3 + sparkline 3 = 28 passed)

Run: `npx tsc --noEmit`
Expected: 타입 에러 0.

Run: `npm run build-storybook -- --disable-telemetry`
Expected: 빌드 성공, Data/* 스토리(Table·DataTable·KPITile·Feedback·DatePicker) 모두 포함.

Run: `npm run build`
Expected: Next.js 빌드 성공.

- [ ] **Step 3: Commit**

```bash
git add components/ui/index.ts
git commit -m "chore: 데이터 계층 배럴 export + D1-B 전체 검증"
```

---

## Self-Review 결과

**Spec 커버리지 (스펙 §6.2 데이터 컴포넌트 + 이월분):**
- DataTable(정렬·필터·페이지·조밀밀도·고정헤더·행선택) → Task 2(프리미티브)+Task 3(tanstack) ✅
- KPITile(수치+델타+스파크라인) → Task 4 ✅
- ProgressBar → Task 5 ✅ / EmptyState → Task 5 ✅ / Skeleton → Task 5 ✅
- DatePicker(달력) → Task 6 ✅ (D1-A 이월분)
- 토큰↔CSS 교차 정합성 테스트 → Task 1 ✅ (D0 리뷰 이월)
- 각 스토리 다크/라이트: 기존 withTheme 데코레이터 공통 제공 ✅
- `/a11y`: addon-a11y 자동 점검 + progressbar/role·aria 속성 부여

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드 포함.

**타입 일관성:** `Tone`(D1-A status-pill) → KPITile·ProgressBar에서 재사용. `sparklinePoints`(Task 4) 시그니처가 테스트·컴포넌트·배럴에서 동일. DataTable은 D1-A의 Table/Input/Button 재사용. 배럴 export명이 각 파일 실제 export와 일치(Task 7에서 확인).

**행선택 주의:** DataTable은 `enableRowSelection: true`로 tanstack 선택 상태를 관리하지만, 선택 체크박스 컬럼은 이 플랜에서 렌더하지 않는다(스펙의 "행선택" 기반 상태만 확보). 체크박스 선택 컬럼 UI는 실제 화면(D2/R1)에서 컬럼 정의로 조립 — 과설계(YAGNI) 방지. 이 결정을 스토리/문서에 남긴다.

**범위:** D1-B 데이터 계층만. 레이아웃(AppShell 등)=D1-C, MES특화(WorkOrderCard·GenealogyTree 등)=D1-D. 단독으로 테스트·빌드 가능한 완결 단위.
