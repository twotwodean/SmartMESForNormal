# D1-D MES 특화(MES-specific) 컴포넌트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다(공유 작업 트리). 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.
> **검증 강화:** 각 계층 검증에 단위테스트+빌드뿐 아니라 **Storybook 실제 구동 + Playwright 실렌더 검증**을 포함한다(사용자 지침).

**Goal:** MES 도메인 특화 컴포넌트(WorkOrderCard·Stepper·GaugeTile·KioskNumpad·GenealogyTree)를 D0 토큰·D1-A/B/C 위에 구축하고, 순수 로직 테스트 + Storybook 스토리 + 실렌더 검증으로 완성한다. 이로써 D1(컴포넌트 라이브러리)을 마무리한다.

**Architecture:** 각 컴포넌트는 순수 로직(단계 상태·게이지 각도·키패드 입력·계보 노드 수)을 테스트 가능한 함수로 분리하고, 시각은 의존성 없는 인라인 SVG/Tailwind 토큰으로 구현한다. WorkOrderCard는 D1-A/B의 StatusPill·ProgressBar·Badge를 조립한다. KioskNumpad는 현장 대형 터치(최소 64px 타깃). 색은 D0 토큰만.

**Tech Stack:** React 18 + TS, lucide-react, Vitest + @testing-library/react (jsdom), Storybook 8. (신규 외부 의존성 없음)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `components/ui/work-order-card.tsx` | WorkOrderCard(칸반 카드) |
| `components/ui/stepper.tsx` | Stepper(공정 진행) + 순수 `stepStatus` |
| `components/ui/stepper.test.ts` | `stepStatus` 테스트 |
| `components/ui/gauge-tile.tsx` | GaugeTile(라디얼 게이지) + 순수 `gaugeOffset` |
| `components/ui/gauge-tile.test.ts` | `gaugeOffset` 테스트 |
| `components/ui/kiosk-numpad.tsx` | KioskNumpad(현장 대형 키패드) + 순수 `applyKey` |
| `components/ui/kiosk-numpad.test.tsx` | `applyKey` + 입력 동작 테스트 |
| `components/ui/genealogy-tree.tsx` | GenealogyTree(Lot 계보 트리) + 순수 `countNodes` |
| `components/ui/genealogy-tree.test.tsx` | `countNodes` + 선택 동작 테스트 |
| `components/ui/index.ts` | (수정) 배럴 확장 |
| `stories/*.stories.tsx` | 컴포넌트별 스토리 |

`docs/superpowers/specs/2026-07-09-mes-design-system-design.md` §6.4 참조. GanttBar·ParetoChart·ControlChart·HeatmapCell은 후속(범위 밖).

---

### Task 1: WorkOrderCard (칸반 카드)

**Files:** Create `components/ui/work-order-card.tsx`, `stories/work-order-card.stories.tsx`.

- [ ] **Step 1: `components/ui/work-order-card.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface WorkOrderCardProps {
  code: string;
  item: string;
  qty: number;
  /** 0–100. 생략 시 진척바 미표시 */
  progress?: number;
  statusLabel: string;
  tone: Tone;
  center?: string;
  onClick?: () => void;
  className?: string;
}

export function WorkOrderCard({
  code, item, qty, progress, statusLabel, tone, center, onClick, className,
}: WorkOrderCardProps) {
  const clickable = Boolean(onClick);
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-3 shadow-card",
        clickable && "cursor-pointer transition hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-caption text-text-muted">{code}</span>
        <StatusPill tone={tone}>{statusLabel}</StatusPill>
      </div>
      <div className="mt-1.5 text-body-sm font-medium text-text">{item}</div>
      <div className="num mt-0.5 text-caption text-text-muted">
        {qty.toLocaleString()} EA{center ? ` · ${center}` : ""}
      </div>
      {progress !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={progress} tone={tone} className="flex-1" aria-label={`진척률 ${Math.round(progress)}%`} />
          <span className="num text-caption text-text-muted">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `stories/work-order-card.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { WorkOrderCard } from "@/components/ui/work-order-card";

const meta: Meta<typeof WorkOrderCard> = { title: "MES/WorkOrderCard", component: WorkOrderCard };
export default meta;
type Story = StoryObj<typeof WorkOrderCard>;

export const Kanban: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 220px)", gap: 12, alignItems: "start" }}>
      <WorkOrderCard code="WO-260709-011" item="기어박스 GB-2500" qty={300} statusLabel="대기" tone="warn" center="조립 1라인" />
      <WorkOrderCard code="WO-260709-014" item="브라켓 ASSY (RF-L)" qty={1200} progress={72} statusLabel="진행" tone="primary" center="CNC 1라인" onClick={() => {}} />
      <WorkOrderCard code="WO-260709-013" item="하우징 커버 M3" qty={800} progress={100} statusLabel="완료" tone="ok" center="프레스 2라인" />
    </div>
  ),
};
```

- [ ] **Step 3: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/work-order-card.tsx stories/work-order-card.stories.tsx
git commit -m "feat: WorkOrderCard(칸반 카드, StatusPill/ProgressBar 조립) + 스토리"
```

---

### Task 2: Stepper (공정 진행) — 순수 로직 테스트

**Files:** Create `components/ui/stepper.tsx`, `components/ui/stepper.test.ts`, `stories/stepper.stories.tsx`.

- [ ] **Step 1: 실패하는 테스트 (`components/ui/stepper.test.ts`)**
```ts
import { describe, it, expect } from "vitest";
import { stepStatus } from "@/components/ui/stepper";

describe("stepStatus", () => {
  it("현재 이전은 done, 현재는 current, 이후는 upcoming", () => {
    expect(stepStatus(0, 2)).toBe("done");
    expect(stepStatus(1, 2)).toBe("done");
    expect(stepStatus(2, 2)).toBe("current");
    expect(stepStatus(3, 2)).toBe("upcoming");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run `npm test -- components/ui/stepper.test.ts` → FAIL.

- [ ] **Step 3: `components/ui/stepper.tsx`**
```tsx
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "upcoming";

export function stepStatus(index: number, current: number): StepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "upcoming";
}

export interface StepperProps {
  steps: string[];
  /** 현재 단계 인덱스(0-base) */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((label, i) => {
        const state = stepStatus(i, current);
        const last = i === steps.length - 1;
        return (
          <li key={label} className="flex items-center" aria-current={state === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-caption font-semibold num",
                  state === "done" && "border-ok bg-ok text-white",
                  state === "current" && "border-primary bg-primary text-primary-fg",
                  state === "upcoming" && "border-border bg-surface text-text-faint",
                )}
              >
                {state === "done" ? <Check size={14} aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-caption", state === "upcoming" ? "text-text-faint" : "text-text")}>{label}</span>
            </div>
            {!last && (
              <span className={cn("mx-2 h-px w-10 flex-none", i < current ? "bg-ok" : "bg-border")} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run `npm test -- components/ui/stepper.test.ts` → PASS.

- [ ] **Step 5: `stories/stepper.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "@/components/ui/stepper";

const meta: Meta<typeof Stepper> = { title: "MES/Stepper", component: Stepper };
export default meta;
type Story = StoryObj<typeof Stepper>;

export const Process: Story = {
  args: { steps: ["절단", "가공", "조립", "검사", "포장"], current: 2 },
};
export const Start: Story = { args: { steps: ["절단", "가공", "조립", "검사", "포장"], current: 0 } };
export const Done: Story = { args: { steps: ["절단", "가공", "조립", "검사", "포장"], current: 4 } };
```

- [ ] **Step 6: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/stepper.tsx components/ui/stepper.test.ts stories/stepper.stories.tsx
git commit -m "feat: Stepper(공정 진행, stepStatus 테스트) + 스토리"
```

---

### Task 3: GaugeTile (라디얼 게이지) — 순수 로직 테스트

**Files:** Create `components/ui/gauge-tile.tsx`, `components/ui/gauge-tile.test.ts`, `stories/gauge-tile.stories.tsx`.

- [ ] **Step 1: 실패하는 테스트 (`components/ui/gauge-tile.test.ts`)**
```ts
import { describe, it, expect } from "vitest";
import { gaugeOffset } from "@/components/ui/gauge-tile";

describe("gaugeOffset", () => {
  it("0%는 전체 둘레만큼 오프셋(빈 링)", () => {
    expect(gaugeOffset(0, 100)).toBe(100);
  });
  it("100%는 오프셋 0(꽉 찬 링)", () => {
    expect(gaugeOffset(100, 100)).toBe(0);
  });
  it("50%는 둘레의 절반", () => {
    expect(gaugeOffset(50, 100)).toBe(50);
  });
  it("범위를 벗어나면 0–100으로 클램프", () => {
    expect(gaugeOffset(-20, 100)).toBe(100);
    expect(gaugeOffset(140, 100)).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run `npm test -- components/ui/gauge-tile.test.ts` → FAIL.

- [ ] **Step 3: `components/ui/gauge-tile.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

/** 채워진 비율에 해당하는 stroke-dashoffset (value 0–100, 벗어나면 클램프) */
export function gaugeOffset(value: number, circumference: number): number {
  const pct = Math.min(100, Math.max(0, value));
  return circumference * (1 - pct / 100);
}

const STROKE: Record<Tone, string> = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  info: "var(--info)",
  neutral: "var(--neutral)",
};

export interface GaugeTileProps {
  label: string;
  value: number; // 0–100
  unit?: string;
  tone?: Tone;
  size?: number;
  className?: string;
}

export function GaugeTile({ label, value, unit = "%", tone = "primary", size = 120, className }: GaugeTileProps) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = gaugeOffset(value, c);
  const shown = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--elevated)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={STROKE[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="num text-h3 font-bold text-text">
            {shown}
            <span className="text-body font-semibold text-text-muted">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-caption text-text-muted">{label}</span>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run `npm test -- components/ui/gauge-tile.test.ts` → PASS.

- [ ] **Step 5: `stories/gauge-tile.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { GaugeTile } from "@/components/ui/gauge-tile";

const meta: Meta<typeof GaugeTile> = { title: "MES/GaugeTile", component: GaugeTile };
export default meta;
type Story = StoryObj<typeof GaugeTile>;

export const OEE: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <GaugeTile label="CNC 1라인 OEE" value={86} tone="ok" />
      <GaugeTile label="선반 3라인 OEE" value={64} tone="warn" />
      <GaugeTile label="조립 1라인 OEE" value={42} tone="crit" />
    </div>
  ),
};
```

- [ ] **Step 6: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/gauge-tile.tsx components/ui/gauge-tile.test.ts stories/gauge-tile.stories.tsx
git commit -m "feat: GaugeTile(라디얼 게이지, gaugeOffset 테스트) + 스토리"
```

---

### Task 4: KioskNumpad (현장 대형 입력) — 순수 로직 + 동작 테스트

**Files:** Create `components/ui/kiosk-numpad.tsx`, `components/ui/kiosk-numpad.test.tsx`, `stories/kiosk-numpad.stories.tsx`.

- [ ] **Step 1: 실패하는 테스트 (`components/ui/kiosk-numpad.test.tsx`)**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyKey, KioskNumpad } from "@/components/ui/kiosk-numpad";

describe("applyKey", () => {
  it("숫자를 뒤에 붙인다", () => {
    expect(applyKey("12", "3")).toBe("123");
  });
  it("선행 0을 대체한다", () => {
    expect(applyKey("0", "5")).toBe("5");
  });
  it("back은 마지막 글자를 지운다", () => {
    expect(applyKey("123", "back")).toBe("12");
  });
  it("clear는 비운다", () => {
    expect(applyKey("123", "clear")).toBe("");
  });
});

describe("KioskNumpad", () => {
  it("숫자 버튼을 누르면 값이 쌓인다", async () => {
    const user = userEvent.setup();
    let value = 0;
    render(<KioskNumpad value={value} onChange={(v) => (value = v)} aria-label="수량" />);
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(value).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run `npm test -- components/ui/kiosk-numpad.test.tsx` → FAIL.

- [ ] **Step 3: `components/ui/kiosk-numpad.tsx`**
```tsx
import * as React from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

/** 키패드 입력 문자열 변환: 숫자 append(선행 0 대체), back=마지막 삭제, clear=초기화 */
export function applyKey(current: string, key: string): string {
  if (key === "clear") return "";
  if (key === "back") return current.slice(0, -1);
  if (/^[0-9]$/.test(key)) return current === "0" ? key : current + key;
  return current;
}

export interface KioskNumpadProps {
  "aria-label": string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export function KioskNumpad({ "aria-label": ariaLabel, value, onChange, className }: KioskNumpadProps) {
  const text = String(value);
  const press = (k: string) => {
    const next = applyKey(text, k);
    onChange(next === "" ? 0 : Number(next));
  };
  return (
    <div className={cn("inline-flex w-64 flex-col gap-3", className)}>
      <div
        role="status"
        aria-label={ariaLabel}
        className="num flex h-16 items-center justify-end rounded-lg border border-border bg-surface px-4 text-[32px] font-bold text-text"
      >
        {value.toLocaleString()}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => {
          const label = k === "clear" ? "C" : k === "back" ? "지움" : k;
          const aria = k === "clear" ? "전체 지움" : k === "back" ? "한 자리 지움" : k;
          return (
            <button
              key={k}
              type="button"
              aria-label={aria}
              onClick={() => press(k)}
              className={cn(
                "flex h-16 items-center justify-center rounded-lg border border-border text-[22px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                k === "clear" ? "bg-crit-soft text-crit" : k === "back" ? "bg-elevated text-text-muted" : "bg-surface text-text hover:bg-elevated",
              )}
            >
              {k === "back" ? <Delete size={22} aria-hidden /> : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run `npm test -- components/ui/kiosk-numpad.test.tsx` → PASS (5 passed).

- [ ] **Step 5: `stories/kiosk-numpad.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { KioskNumpad } from "@/components/ui/kiosk-numpad";

const meta: Meta<typeof KioskNumpad> = { title: "MES/KioskNumpad", component: KioskNumpad };
export default meta;
type Story = StoryObj<typeof KioskNumpad>;

export const Default: Story = {
  render: () => {
    const [v, setV] = React.useState(0);
    return <KioskNumpad value={v} onChange={setV} aria-label="양품 수량" />;
  },
};
```

- [ ] **Step 6: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/kiosk-numpad.tsx components/ui/kiosk-numpad.test.tsx stories/kiosk-numpad.stories.tsx
git commit -m "feat: KioskNumpad(현장 대형 키패드, applyKey 테스트) + 스토리"
```

---

### Task 5: GenealogyTree (Lot 계보 트리) — 순수 로직 + 동작 테스트

**Files:** Create `components/ui/genealogy-tree.tsx`, `components/ui/genealogy-tree.test.tsx`, `stories/genealogy-tree.stories.tsx`.

- [ ] **Step 1: 실패하는 테스트 (`components/ui/genealogy-tree.test.tsx`)**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { countNodes, GenealogyTree, type GenealogyNode } from "@/components/ui/genealogy-tree";

const tree: GenealogyNode = {
  id: "L1",
  label: "LOT-A",
  children: [
    { id: "L2", label: "LOT-B", children: [{ id: "L4", label: "LOT-D" }] },
    { id: "L3", label: "LOT-C" },
  ],
};

describe("countNodes", () => {
  it("전체 노드 수를 센다", () => {
    expect(countNodes(tree)).toBe(4);
  });
  it("단일 노드는 1", () => {
    expect(countNodes({ id: "x", label: "x" })).toBe(1);
  });
});

describe("GenealogyTree", () => {
  it("모든 노드를 렌더한다", () => {
    render(<GenealogyTree root={tree} />);
    expect(screen.getByText("LOT-A")).toBeInTheDocument();
    expect(screen.getByText("LOT-D")).toBeInTheDocument();
  });
  it("노드 클릭 시 onSelect가 호출된다", async () => {
    const user = userEvent.setup();
    let selected = "";
    render(<GenealogyTree root={tree} onSelect={(id) => (selected = id)} />);
    await user.click(screen.getByText("LOT-C"));
    expect(selected).toBe("L3");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run `npm test -- components/ui/genealogy-tree.test.tsx` → FAIL.

- [ ] **Step 3: `components/ui/genealogy-tree.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

export interface GenealogyNode {
  id: string;
  label: string;
  sub?: string;
  tone?: Tone;
  children?: GenealogyNode[];
}

/** 서브트리의 전체 노드 수(자신 포함) */
export function countNodes(node: GenealogyNode): number {
  return 1 + (node.children?.reduce((sum, c) => sum + countNodes(c), 0) ?? 0);
}

const DOT: Record<Tone, string> = {
  primary: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-neutral",
};

interface TreeProps {
  root: GenealogyNode;
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

function Node({
  node,
  selectedId,
  onSelect,
}: {
  node: GenealogyNode;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const selected = node.id === selectedId;
  return (
    <li className="relative pl-5">
      {/* 세로/가로 연결선 */}
      <span aria-hidden className="absolute left-0 top-0 h-full w-px bg-border" />
      <span aria-hidden className="absolute left-0 top-3.5 h-px w-4 bg-border" />
      <button
        type="button"
        onClick={() => onSelect?.(node.id)}
        className={cn(
          "relative my-1 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          selected ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-elevated",
        )}
      >
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT[node.tone ?? "neutral"])} />
        <span className="text-body-sm font-medium text-text">{node.label}</span>
        {node.sub && <span className="text-caption text-text-muted">{node.sub}</span>}
      </button>
      {node.children && node.children.length > 0 && (
        <ul className="ml-1">
          {node.children.map((c) => (
            <Node key={c.id} node={c} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function GenealogyTree({ root, selectedId, onSelect, className }: TreeProps) {
  return (
    <ul className={cn("text-body-sm", className)}>
      <Node node={root} selectedId={selectedId} onSelect={onSelect} />
    </ul>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run `npm test -- components/ui/genealogy-tree.test.tsx` → PASS (4 passed).

- [ ] **Step 5: `stories/genealogy-tree.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { GenealogyTree, type GenealogyNode } from "@/components/ui/genealogy-tree";

const root: GenealogyNode = {
  id: "P1", label: "완제품 LOT-2600714", sub: "기어박스 GB-2500", tone: "ok",
  children: [
    { id: "S1", label: "반제품 LOT-2600712", sub: "샤프트 SUS-304", tone: "primary",
      children: [{ id: "R1", label: "원자재 LOT-2600701", sub: "환봉 Ø50", tone: "neutral" }] },
    { id: "S2", label: "반제품 LOT-2600713", sub: "하우징 M3", tone: "warn",
      children: [{ id: "R2", label: "원자재 LOT-2600705", sub: "알루미늄 6061", tone: "neutral" }] },
  ],
};

const meta: Meta<typeof GenealogyTree> = { title: "MES/GenealogyTree", component: GenealogyTree };
export default meta;
type Story = StoryObj<typeof GenealogyTree>;

export const Lineage: Story = {
  render: () => {
    const [sel, setSel] = React.useState<string | undefined>("S1");
    return <GenealogyTree root={root} selectedId={sel} onSelect={setSel} />;
  },
};
```

- [ ] **Step 6: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/genealogy-tree.tsx components/ui/genealogy-tree.test.tsx stories/genealogy-tree.stories.tsx
git commit -m "feat: GenealogyTree(Lot 계보 트리, countNodes 테스트) + 스토리"
```

---

### Task 6: 배럴 확장 + 전체 검증(실렌더 포함)

**Files:** Modify `components/ui/index.ts`.

- [ ] **Step 1: `components/ui/index.ts`에 MES 계층 export 추가**
기존 export 아래에 추가:
```ts
export { WorkOrderCard, type WorkOrderCardProps } from "./work-order-card";
export { Stepper, stepStatus, type StepState, type StepperProps } from "./stepper";
export { GaugeTile, gaugeOffset, type GaugeTileProps } from "./gauge-tile";
export { KioskNumpad, applyKey, type KioskNumpadProps } from "./kiosk-numpad";
export { GenealogyTree, countNodes, type GenealogyNode } from "./genealogy-tree";
```
각 export명이 실제 파일 export와 일치하는지 확인 후 확정.

- [ ] **Step 2: 전체 검증**
Run `npm test` → 모든 테스트 통과 (D1-C 35 + stepper 1 + gauge 4 + kiosk 5 + genealogy 4 = 49 passed). 정확 카운트 보고.
Run `npx tsc --noEmit` → 타입 에러 0.
Run `npm run build-storybook -- --disable-telemetry` → 성공, MES/* 스토리 포함.
Run `npm run build` → Next.js 빌드 성공.

- [ ] **Step 3: Commit**
```bash
git add components/ui/index.ts
git commit -m "chore: MES 특화 계층 배럴 export + D1-D 전체 검증"
```

---

## Self-Review 결과

**Spec 커버리지 (스펙 §6.4 MES 특화):**
- WorkOrderCard(칸반) → Task 1 ✅ / Stepper(공정 진행) → Task 2 ✅ / GaugeTile(OEE·환경) → Task 3 ✅
- KioskNumpad(현장 대형 입력) → Task 4 ✅ (KioskStepper는 D1-A NumberStepper `kiosk` 프롭으로 이미 제공 — 중복 제작 안 함)
- GenealogyTree(Lot 계보) → Task 5 ✅
- GanttBar·ParetoChart·ControlChart·HeatmapCell → 후속(범위 밖, 명시)
- 각 스토리 다크/라이트: withTheme 데코레이터 공통 ✅
- `/a11y`: WorkOrderCard 클릭 시 role=button+키보드, Stepper aria-current=step, KioskNumpad 버튼 aria-label, GenealogyTree 노드 버튼, 장식 요소 aria-hidden

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드 포함.

**타입 일관성:** `Tone`(status-pill) → WorkOrderCard·GaugeTile·GenealogyTree에서 재사용. 순수 함수(`stepStatus`·`gaugeOffset`·`applyKey`·`countNodes`) 시그니처가 테스트·컴포넌트·배럴에서 동일. 배럴 export명은 Task 6에서 대조.

**검증 강화:** Task 6 이후 계층 최종 검증에서 Storybook 실제 구동 + Playwright로 MES/* 인터랙티브(WorkOrderCard 클릭·KioskNumpad 입력·GenealogyTree 선택) 실렌더 확인.

**범위:** D1-D로 D1(컴포넌트 라이브러리) 완료. 이후 D2(핵심 화면 7개 하이파이 목업)로 진행.
