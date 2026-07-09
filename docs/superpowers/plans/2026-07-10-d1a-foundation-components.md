# D1-A 기반(Foundation) 컴포넌트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** D0 토큰 위에 기반 UI 컴포넌트(Button·IconButton·Badge·StatusPill·Input·Textarea·Checkbox·Radio·Switch·Select·NumberStepper)를 Radix+cva 패턴으로 우리 토큰에 맞춰 구축하고, 각 컴포넌트를 Storybook 스토리(상태·크기·다크/라이트 변형)와 로직 테스트로 검증한다.

**Architecture:** shadcn/ui의 패턴(Radix 프리미티브 + class-variance-authority + `cn` 유틸)을 채택하되 별도 shadcn 변수 레이어 없이 D0 토큰(`bg-surface`, `text-text`, `border-border`, `ring-primary` 등)으로 직접 스타일링한다. 컴포넌트는 `components/ui/`에 배치하고, 순수 로직(값 클램프·상태→색 매핑)은 테스트 가능한 함수로 분리한다. 스토리는 D0에서 만든 `withTheme` 데코레이터(다크/라이트 툴바)를 그대로 사용한다. 접근성은 `@storybook/addon-a11y`로 Storybook에서 자동 점검한다.

**Tech Stack:** React 18 + TS, Radix UI primitives, class-variance-authority, clsx + tailwind-merge, lucide-react, Vitest + @testing-library/react (jsdom), Storybook 8 + addon-a11y.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/utils.ts` | `cn()` 클래스 병합 유틸 (clsx + tailwind-merge) |
| `lib/utils.test.ts` | `cn()` 단위테스트 |
| `vitest.config.ts` | (수정) jsdom 환경 + react 플러그인 + setup 파일 |
| `vitest.setup.ts` | @testing-library/jest-dom 매처 등록 |
| `.storybook/main.ts` | (수정) addon-a11y 추가 |
| `components/ui/button.tsx` | Button (variant×size, cva) |
| `components/ui/icon-button.tsx` | IconButton (정사각, aria-label 필수) |
| `components/ui/badge.tsx` | Badge (중립 라벨 뱃지) |
| `components/ui/status-pill.tsx` | StatusPill (의미색 상태 Pill) + tone 매핑 |
| `components/ui/status-pill.test.tsx` | StatusPill tone→클래스, 매핑 헬퍼 테스트 |
| `components/ui/input.tsx` | Input |
| `components/ui/textarea.tsx` | Textarea |
| `components/ui/checkbox.tsx` | Checkbox (Radix) |
| `components/ui/radio-group.tsx` | RadioGroup + RadioGroupItem (Radix) |
| `components/ui/switch.tsx` | Switch (Radix) |
| `components/ui/select.tsx` | Select (Radix, Trigger/Content/Item) |
| `components/ui/number-stepper.tsx` | NumberStepper (±, 키오스크 크기) |
| `components/ui/number-stepper.test.tsx` | `stepValue()` 클램프 로직 테스트 |
| `stories/button.stories.tsx` 등 | 컴포넌트별 스토리 |

`docs/superpowers/specs/2026-07-09-mes-design-system-design.md` §6 참조. DatePicker는 캘린더 구현이 무거워 D1-B(데이터 계층) 배치로 이월한다.

---

### Task 1: 컴포넌트 테스트 인프라 + cn 유틸 + addon-a11y

**Files:**
- Create: `lib/utils.ts`, `lib/utils.test.ts`, `vitest.setup.ts`
- Modify: `vitest.config.ts`, `.storybook/main.ts`, `package.json` (deps)

- [ ] **Step 1: 의존성 설치**

Run (bash):
```bash
npm install class-variance-authority@0.7.0 clsx@2.1.1 tailwind-merge@2.4.0 \
  @radix-ui/react-select@2.1.1 @radix-ui/react-checkbox@1.1.1 @radix-ui/react-switch@1.1.0 \
  @radix-ui/react-radio-group@1.2.0 @radix-ui/react-label@2.1.0
npm install -D jsdom@24.1.1 @testing-library/react@16.0.0 @testing-library/dom@10.4.0 \
  @testing-library/jest-dom@6.4.8 @testing-library/user-event@14.5.2 @storybook/addon-a11y@8.2.6
```
Expected: 설치 완료, 오류 없음. 정확한 버전 해석이 실패하면 major.minor 유지하며 근접 패치 허용, 대체 시 보고.

- [ ] **Step 2: `lib/utils.ts` 작성**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 조건부 클래스 병합 + Tailwind 충돌 해소 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: `lib/utils.test.ts` 작성 (실패 확인용)**

```ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("클래스들을 합친다", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("falsy 값을 무시한다", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("Tailwind 충돌은 뒤 값이 이긴다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
```

- [ ] **Step 4: `vitest.setup.ts` 작성**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: `vitest.config.ts` 수정 (jsdom + react + setup)**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 6: `.storybook/main.ts`에 addon-a11y 추가**

`addons` 배열을 다음으로 변경 (기존 essentials 유지, a11y 추가):
```ts
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
```
다른 필드(stories, framework, viteFinal)는 그대로 둔다.

- [ ] **Step 7: 테스트 실행 (기존 8 + cn 3 통과 확인)**

Run: `npm test`
Expected: 11 passed (design-tokens 4 + theme 4 + cn 3). jsdom 전환 후에도 기존 테스트가 통과해야 한다.

- [ ] **Step 8: Storybook 빌드로 addon 로딩 확인**

Run: `npm run build-storybook -- --disable-telemetry`
Expected: 빌드 성공(0 에러). a11y addon이 정상 로드. `storybook-static/`는 커밋하지 않는다.

- [ ] **Step 9: Commit**

```bash
git add lib/utils.ts lib/utils.test.ts vitest.setup.ts vitest.config.ts .storybook/main.ts package.json package-lock.json
git commit -m "chore: D1 컴포넌트 테스트 인프라(jsdom+testing-library) + cn 유틸 + a11y addon"
```

---

### Task 2: Button + IconButton

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/icon-button.tsx`
- Create: `stories/button.stories.tsx`

- [ ] **Step 1: `components/ui/button.tsx` 작성**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary/90",
        secondary: "border border-border bg-surface text-text hover:bg-elevated",
        ghost: "text-text-muted hover:bg-elevated hover:text-text",
        danger: "bg-crit text-white hover:bg-crit/90",
      },
      size: {
        sm: "h-8 px-3 text-body-sm",
        md: "h-9 px-4 text-body-sm",
        lg: "h-11 px-6 text-body",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
```

- [ ] **Step 2: `components/ui/icon-button.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";

export interface IconButtonProps extends ButtonProps {
  "aria-label": string; // 아이콘 전용이므로 라벨 필수
}

const sizeSquare = { sm: "h-8 w-8 px-0", md: "h-9 w-9 px-0", lg: "h-11 w-11 px-0" } as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), sizeSquare[size ?? "md"], className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
```

- [ ] **Step 3: `stories/button.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

const meta: Meta<typeof Button> = { title: "Foundation/Button", component: Button };
export default meta;
type Story = StoryObj<typeof Button>;

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button variant="primary">등록</Button>
      <Button variant="secondary">취소</Button>
      <Button variant="ghost">더보기</Button>
      <Button variant="danger">삭제</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Disabled: Story = { args: { children: "비활성", disabled: true } };

export const Icons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="primary"><Plus size={16} /> 추가</Button>
      <IconButton aria-label="삭제" variant="danger"><Trash2 size={16} /></IconButton>
    </div>
  ),
};
```

- [ ] **Step 4: 검증**

Run: `npm run build-storybook -- --disable-telemetry` (성공) 그리고 `npx tsc --noEmit` (클린)
Expected: 빌드 성공, 타입 에러 0.

- [ ] **Step 5: Commit**

```bash
git add components/ui/button.tsx components/ui/icon-button.tsx stories/button.stories.tsx
git commit -m "feat: Button + IconButton (cva variant×size) + 스토리"
```

---

### Task 3: Badge + StatusPill (의미색 상태) — 로직 테스트 포함

**Files:**
- Create: `components/ui/badge.tsx`, `components/ui/status-pill.tsx`
- Test: `components/ui/status-pill.test.tsx`
- Create: `stories/status-pill.stories.tsx`

- [ ] **Step 1: 실패하는 테스트 작성 (`components/ui/status-pill.test.tsx`)**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";

describe("StatusPill", () => {
  it("tone에 맞는 의미색 클래스를 적용한다", () => {
    render(<StatusPill tone="ok">완료</StatusPill>);
    const pill = screen.getByText("완료");
    expect(pill.className).toContain("text-ok");
    expect(pill.className).toContain("bg-ok-soft");
  });

  it("workOrderTone은 상태를 tone으로 매핑한다", () => {
    expect(workOrderTone("WAITING")).toBe("warn");
    expect(workOrderTone("RUNNING")).toBe("primary");
    expect(workOrderTone("DONE")).toBe("ok");
    expect(workOrderTone("CANCELLED")).toBe("neutral");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- components/ui/status-pill.test.tsx`
Expected: FAIL — cannot resolve import "@/components/ui/status-pill".

- [ ] **Step 3: `components/ui/status-pill.tsx` 작성**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type Tone = "primary" | "ok" | "warn" | "crit" | "info" | "neutral";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold leading-relaxed",
  {
    variants: {
      tone: {
        primary: "bg-primary-soft text-primary",
        ok: "bg-ok-soft text-ok",
        warn: "bg-warn-soft text-warn",
        crit: "bg-crit-soft text-crit",
        info: "bg-info-soft text-info",
        neutral: "bg-neutral-soft text-neutral",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  /** 색상 점 표시 여부 (기본 true) */
  dot?: boolean;
}

export function StatusPill({ tone, dot = true, className, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(pillVariants({ tone }), className)} {...props}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// 상태 → tone 매핑 (design-tokens STATUS_COLOR와 일치)
export function workOrderTone(status: "WAITING" | "RUNNING" | "DONE" | "CANCELLED"): Tone {
  return { WAITING: "warn", RUNNING: "primary", DONE: "ok", CANCELLED: "neutral" }[status] as Tone;
}
export function equipmentTone(status: "RUN" | "STOP" | "REPAIR"): Tone {
  return { RUN: "ok", STOP: "neutral", REPAIR: "crit" }[status] as Tone;
}
export function inspectionTone(status: "PASS" | "FAIL" | "SPECIAL"): Tone {
  return { PASS: "ok", FAIL: "crit", SPECIAL: "warn" }[status] as Tone;
}
```

- [ ] **Step 4: `components/ui/badge.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-elevated px-2 py-0.5 text-caption font-medium text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- components/ui/status-pill.test.tsx`
Expected: PASS (2 passed)

- [ ] **Step 6: `stories/status-pill.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { StatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof StatusPill> = { title: "Foundation/StatusPill", component: StatusPill };
export default meta;
type Story = StoryObj<typeof StatusPill>;

export const Tones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <StatusPill tone="warn">대기</StatusPill>
      <StatusPill tone="primary">진행</StatusPill>
      <StatusPill tone="ok">완료</StatusPill>
      <StatusPill tone="neutral">취소</StatusPill>
      <StatusPill tone="crit">불량</StatusPill>
      <StatusPill tone="info">이동</StatusPill>
    </div>
  ),
};

export const NoDot: Story = { args: { tone: "ok", dot: false, children: "합격" } };

export const Badges: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Badge>원자재</Badge>
      <Badge>반제품</Badge>
      <Badge>완제품</Badge>
    </div>
  ),
};
```

- [ ] **Step 7: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/badge.tsx components/ui/status-pill.tsx components/ui/status-pill.test.tsx stories/status-pill.stories.tsx
git commit -m "feat: StatusPill(의미색 상태 매핑) + Badge + 테스트/스토리"
```

---

### Task 4: Input + Textarea

**Files:**
- Create: `components/ui/input.tsx`, `components/ui/textarea.tsx`
- Create: `stories/input.stories.tsx`

- [ ] **Step 1: `components/ui/input.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-text transition placeholder:text-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

- [ ] **Step 2: `components/ui/textarea.tsx` 작성**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text transition placeholder:text-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
```

- [ ] **Step 3: `stories/input.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const meta: Meta<typeof Input> = { title: "Foundation/Input", component: Input };
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "품목명 입력" } };
export const Disabled: Story = { args: { placeholder: "비활성", disabled: true } };
export const WithValue: Story = { args: { defaultValue: "브라켓 ASSY (RF-L)" } };
export const TextareaStory: Story = {
  name: "Textarea",
  render: () => <Textarea placeholder="비고 입력" style={{ width: 320 }} />,
};
```

- [ ] **Step 4: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/input.tsx components/ui/textarea.tsx stories/input.stories.tsx
git commit -m "feat: Input + Textarea + 스토리"
```

---

### Task 5: Checkbox + RadioGroup + Switch (Radix)

**Files:**
- Create: `components/ui/checkbox.tsx`, `components/ui/radio-group.tsx`, `components/ui/switch.tsx`
- Create: `stories/selection-controls.stories.tsx`

- [ ] **Step 1: `components/ui/checkbox.tsx` 작성**

```tsx
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-fg",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check size={12} strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
```

- [ ] **Step 2: `components/ui/radio-group.tsx` 작성**

```tsx
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "h-4 w-4 rounded-full border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 data-[state=checked]:border-primary",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";
```

- [ ] **Step 3: `components/ui/switch.tsx` 작성**

```tsx
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-elevated",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
```

- [ ] **Step 4: `stories/selection-controls.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

const meta: Meta = { title: "Foundation/SelectionControls" };
export default meta;
type Story = StoryObj;

export const Checkboxes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><Checkbox defaultChecked /> 사용</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><Checkbox /> 미사용</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><Checkbox disabled /> 비활성</label>
    </div>
  ),
};

export const Radios: Story = {
  render: () => (
    <RadioGroup defaultValue="prod">
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><RadioGroupItem value="prod" /> 완제품</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><RadioGroupItem value="semi" /> 반제품</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><RadioGroupItem value="raw" /> 원자재</label>
    </RadioGroup>
  ),
};

export const Switches: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <Switch defaultChecked />
      <Switch />
      <Switch disabled />
    </div>
  ),
};
```

- [ ] **Step 5: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/checkbox.tsx components/ui/radio-group.tsx components/ui/switch.tsx stories/selection-controls.stories.tsx
git commit -m "feat: Checkbox + RadioGroup + Switch (Radix, 토큰 리테마) + 스토리"
```

---

### Task 6: Select (Radix)

**Files:**
- Create: `components/ui/select.tsx`
- Create: `stories/select.stories.tsx`

- [ ] **Step 1: `components/ui/select.tsx` 작성**

```tsx
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-body-sm text-text transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 data-[placeholder]:text-text-faint",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={16} className="text-text-faint" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-elevated text-text shadow-modal",
        position === "popper" && "translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-sm outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex items-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
```

- [ ] **Step 2: `stories/select.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const meta: Meta = { title: "Foundation/Select" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Select defaultValue="cnc">
        <SelectTrigger>
          <SelectValue placeholder="작업장 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cnc">CNC 1라인</SelectItem>
          <SelectItem value="press">프레스 2라인</SelectItem>
          <SelectItem value="lathe">선반 3라인</SelectItem>
          <SelectItem value="asm">조립 1라인</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Placeholder: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="작업장 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cnc">CNC 1라인</SelectItem>
          <SelectItem value="press">프레스 2라인</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
```

- [ ] **Step 3: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/select.tsx stories/select.stories.tsx
git commit -m "feat: Select (Radix, 토큰 리테마) + 스토리"
```

---

### Task 7: NumberStepper (키오스크 ±) — 로직 테스트 포함

**Files:**
- Create: `components/ui/number-stepper.tsx`
- Test: `components/ui/number-stepper.test.tsx`
- Create: `stories/number-stepper.stories.tsx`

- [ ] **Step 1: 실패하는 테스트 작성 (`components/ui/number-stepper.test.tsx`)**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stepValue, NumberStepper } from "@/components/ui/number-stepper";

describe("stepValue", () => {
  it("step만큼 증감한다", () => {
    expect(stepValue(10, +1, { min: 0, max: 100, step: 5 })).toBe(15);
    expect(stepValue(10, -1, { min: 0, max: 100, step: 5 })).toBe(5);
  });
  it("min/max로 클램프한다", () => {
    expect(stepValue(2, -1, { min: 0, max: 100, step: 5 })).toBe(0);
    expect(stepValue(98, +1, { min: 0, max: 100, step: 5 })).toBe(100);
  });
});

describe("NumberStepper", () => {
  it("＋ 버튼 클릭 시 값이 증가한다", async () => {
    const user = userEvent.setup();
    render(<NumberStepper defaultValue={10} step={5} min={0} max={100} aria-label="양품 수량" />);
    await user.click(screen.getByRole("button", { name: "증가" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(15);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- components/ui/number-stepper.test.tsx`
Expected: FAIL — cannot resolve import "@/components/ui/number-stepper".

- [ ] **Step 3: `components/ui/number-stepper.tsx` 작성**

```tsx
import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepOpts {
  min: number;
  max: number;
  step: number;
}

/** 현재값을 delta(±1) 방향으로 step만큼 이동하고 min/max로 클램프 */
export function stepValue(current: number, delta: 1 | -1, { min, max, step }: StepOpts): number {
  const next = current + delta * step;
  return Math.min(max, Math.max(min, next));
}

export interface NumberStepperProps {
  "aria-label": string;
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 현장 키오스크용 대형 크기 */
  kiosk?: boolean;
  disabled?: boolean;
}

export function NumberStepper({
  "aria-label": ariaLabel,
  defaultValue = 0,
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  kiosk = false,
  disabled = false,
}: NumberStepperProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;

  function set(next: number) {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  }

  function bump(delta: 1 | -1) {
    set(stepValue(current, delta, { min, max, step }));
  }

  const btn = cn(
    "flex items-center justify-center rounded-md border border-border bg-elevated text-text transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
    kiosk ? "h-14 w-14" : "h-9 w-9",
  );

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" aria-label="감소" className={btn} onClick={() => bump(-1)} disabled={disabled || current <= min}>
        <Minus size={kiosk ? 24 : 16} />
      </button>
      <input
        type="number"
        role="spinbutton"
        aria-label={ariaLabel}
        className={cn(
          "num rounded-md border border-border bg-surface text-center text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
          kiosk ? "h-14 w-24 text-[28px] font-bold" : "h-9 w-20 text-body-sm",
        )}
        value={current}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) set(Math.min(max, Math.max(min, n)));
        }}
      />
      <button type="button" aria-label="증가" className={btn} onClick={() => bump(1)} disabled={disabled || current >= max}>
        <Plus size={kiosk ? 24 : 16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- components/ui/number-stepper.test.tsx`
Expected: PASS (3 passed)

- [ ] **Step 5: `stories/number-stepper.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { NumberStepper } from "@/components/ui/number-stepper";

const meta: Meta<typeof NumberStepper> = { title: "Foundation/NumberStepper", component: NumberStepper };
export default meta;
type Story = StoryObj<typeof NumberStepper>;

export const Default: Story = { args: { "aria-label": "수량", defaultValue: 10, min: 0, max: 100, step: 5 } };
export const Kiosk: Story = { args: { "aria-label": "양품 수량", defaultValue: 1148, min: 0, max: 9999, step: 1, kiosk: true } };
export const Disabled: Story = { args: { "aria-label": "수량", defaultValue: 0, disabled: true } };
```

- [ ] **Step 6: 검증 + Commit**

Run: `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린)
```bash
git add components/ui/number-stepper.tsx components/ui/number-stepper.test.tsx stories/number-stepper.stories.tsx
git commit -m "feat: NumberStepper(키오스크 ±, 클램프 로직) + 테스트/스토리"
```

---

### Task 8: 검증 & Foundation 배럴 export

**Files:**
- Create: `components/ui/index.ts`

- [ ] **Step 1: `components/ui/index.ts` 작성 (배럴 export)**

```ts
export { Button, buttonVariants, type ButtonProps } from "./button";
export { IconButton, type IconButtonProps } from "./icon-button";
export { Badge } from "./badge";
export {
  StatusPill, workOrderTone, equipmentTone, inspectionTone,
  type Tone, type StatusPillProps,
} from "./status-pill";
export { Input } from "./input";
export { Textarea } from "./textarea";
export { Checkbox } from "./checkbox";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export { Switch } from "./switch";
export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem,
} from "./select";
export { NumberStepper, stepValue, type NumberStepperProps } from "./number-stepper";
```

- [ ] **Step 2: 전체 검증**

Run: `npm test`
Expected: 모든 테스트 통과 (design-tokens 4 + theme 4 + cn 3 + status-pill 2 + number-stepper 3 = 16 passed)

Run: `npx tsc --noEmit`
Expected: 타입 에러 0.

Run: `npm run build-storybook -- --disable-telemetry`
Expected: 빌드 성공, Foundation/* 스토리 모두 포함.

Run: `npm run build`
Expected: Next.js 빌드 성공 (index.ts는 앱에서 미사용이어도 컴파일 OK).

- [ ] **Step 3: Commit**

```bash
git add components/ui/index.ts
git commit -m "chore: Foundation 컴포넌트 배럴 export + D1-A 전체 검증"
```

---

## Self-Review 결과

**Spec 커버리지 (스펙 §6.1 기반 컴포넌트):**
- Button(4 variant × 3 size) → Task 2 ✅ / IconButton → Task 2 ✅
- Input → Task 4 ✅ / Textarea → Task 4 ✅
- Checkbox/Radio → Task 5 ✅ / Switch → Task 5 ✅
- Select → Task 6 ✅
- NumberStepper(키오스크 ±) → Task 7 ✅
- Badge → Task 3 ✅ / StatusPill → Task 3 ✅
- DatePicker → **의도적 이월**(D1-B, 캘린더 구현 무거움) — 문서에 명시
- 각 스토리 다크/라이트 변형: 기존 `withTheme` 데코레이터 툴바로 공통 제공 ✅
- `/a11y`: addon-a11y로 Storybook 자동 점검(Task 1) + 실행 시 `/a11y` 스킬 리뷰

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드 포함.

**타입 일관성:** `cn`(Task 1) → 전 컴포넌트에서 사용. `buttonVariants`/`ButtonProps`(Task 2) → IconButton에서 재사용. `Tone`(Task 3) → StatusPill/매핑 헬퍼 일관. `stepValue`(Task 7) 시그니처가 테스트와 구현에서 동일. 배럴 export(Task 8)가 각 파일의 실제 export명과 일치.

**범위:** D1-A 기반 계층만. 데이터(DataTable·KPITile 등)·레이아웃(AppShell 등)·MES특화(WorkOrderCard·GenealogyTree 등)는 별도 플랜(D1-B/C/D). 단독으로 테스트·빌드 가능한 완결 단위.

**D0 최종리뷰 이월 항목 반영:** 토큰↔CSS 교차 정합성 테스트는 D1-B 착수 시 별도 태스크로 추가 예정(이 플랜 범위 밖, 상단 노트).
