# D1-C 레이아웃(Layout/Nav) 컴포넌트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 검토(리뷰) 에이전트와 구현 에이전트를 절대 동시에 돌리지 않는다(공유 작업 트리). 리뷰 에이전트는 `git checkout`/`stash`/파일 이동 금지, 현재 HEAD만 대상으로 게이트 실행.

**Goal:** MES 앱 골격을 이루는 레이아웃/네비 컴포넌트(Card/Panel·SectionHeader·Breadcrumb·Tabs·Dialog(Modal)·Drawer·Toast·ConnectionBadge·Clock·AppShell)를 D0 토큰·D1-A/B 위에 구축하고, 각 컴포넌트를 Storybook 스토리와 로직 테스트로 검증한다.

**Architecture:** 오버레이(Tabs·Dialog·Drawer·Toast)는 Radix 프리미티브를 우리 토큰으로 리테마해 접근성(포커스 트랩·ESC·ARIA)을 확보한다. AppShell은 좌측 고정 사이드바(SidebarNav) + 스티키 톱바(Topbar) + max-w 콘텐츠의 CSS Grid 골격으로, Breadcrumb·ConnectionBadge·Clock·ThemeToggle를 조립한다. 순수 로직(시계 포맷)은 테스트 가능한 함수로 분리한다. 모든 색·간격은 D0 토큰만 사용.

**Tech Stack:** React 18 + TS, @radix-ui/react-tabs·react-dialog·react-toast, lucide-react, Vitest + @testing-library/react (jsdom), Storybook 8.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `components/ui/card.tsx` | Card/Panel + CardHeader/CardTitle/CardContent |
| `components/ui/section-header.tsx` | 페이지/섹션 헤더(타이틀+설명+액션 슬롯) |
| `components/ui/breadcrumb.tsx` | Breadcrumb(항목 배열) |
| `components/ui/tabs.tsx` | Tabs(Radix) |
| `components/ui/dialog.tsx` | Modal(Radix Dialog) |
| `components/ui/drawer.tsx` | Drawer(우측 슬라이드, Radix Dialog 기반) |
| `components/ui/toast.tsx` | Toast(Radix) + ToastProvider/useToast |
| `components/ui/toast.test.tsx` | useToast 동작 테스트 |
| `components/ui/connection-badge.tsx` | 연결 상태 뱃지(연결/끊김/재연결) |
| `components/ui/clock.tsx` | Clock(라이브 시계) + 순수 `formatClock` |
| `components/ui/clock.test.ts` | `formatClock` 테스트 |
| `components/ui/app-shell.tsx` | AppShell(Grid) + SidebarNav + Topbar |
| `components/ui/index.ts` | (수정) 배럴 확장 |
| `stories/*.stories.tsx` | 컴포넌트별 스토리 |

`docs/superpowers/specs/2026-07-09-mes-design-system-design.md` §6.3 참조.

---

### Task 1: 의존성 + Card/Panel + SectionHeader

**Files:** Create `components/ui/card.tsx`, `components/ui/section-header.tsx`, `stories/card.stories.tsx`; Modify `package.json`.

- [ ] **Step 1: 의존성 설치 (bash)**
```bash
npm install @radix-ui/react-tabs@1.1.0 @radix-ui/react-dialog@1.1.1 @radix-ui/react-toast@1.2.1
```
Expected: 설치 성공. 버전 실패 시 major.minor 유지·근접 패치 허용, 보고.

- [ ] **Step 2: `components/ui/card.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border border-border bg-surface shadow-card", className)} {...props} />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 border-b border-border px-4 py-3", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-body font-semibold text-text", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4", className)} {...props} />,
);
CardContent.displayName = "CardContent";
```

- [ ] **Step 3: `components/ui/section-header.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** 우측 액션 슬롯(버튼 등) */
  actions?: React.ReactNode;
}

export function SectionHeader({ title, description, actions, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props}>
      <div>
        <h1 className="text-h1 font-bold text-text">{title}</h1>
        {description && <p className="mt-0.5 text-body-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: `stories/card.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";

const meta: Meta = { title: "Layout/Card" };
export default meta;
type Story = StoryObj;

export const Panel: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>작업지시</CardTitle>
        <span className="ml-auto text-caption text-text-faint">진행 5 · 대기 3</span>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm text-text-muted">패널 본문 영역. 조밀한 테이블·리스트가 들어갑니다.</p>
      </CardContent>
    </Card>
  ),
};

export const PageHeader: Story = {
  render: () => (
    <div style={{ width: 720 }}>
      <SectionHeader
        title="생산 통합 현황"
        description="2공장 · 실시간 POP · 오늘 08:00–14:32 기준"
        actions={<><Button variant="secondary" size="sm">내보내기</Button><Button size="sm">새 작업지시</Button></>}
      />
    </div>
  ),
};
```

- [ ] **Step 5: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/card.tsx components/ui/section-header.tsx stories/card.stories.tsx package.json package-lock.json
git commit -m "feat: Card/Panel + SectionHeader + 레이아웃 계층 의존성"
```

---

### Task 2: Breadcrumb + Tabs

**Files:** Create `components/ui/breadcrumb.tsx`, `components/ui/tabs.tsx`, `stories/navigation.stories.tsx`.

- [ ] **Step 1: `components/ui/breadcrumb.tsx`**
```tsx
import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: Crumb[];
}

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={cn("flex items-center gap-1 text-body-sm", className)} {...props}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            {c.href && !last ? (
              <a href={c.href} className="text-text-muted hover:text-text">{c.label}</a>
            ) : (
              <span className={last ? "font-semibold text-text" : "text-text-muted"} aria-current={last ? "page" : undefined}>
                {c.label}
              </span>
            )}
            {!last && <ChevronRight size={14} className="text-text-faint" aria-hidden />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: `components/ui/tabs.tsx`**
```tsx
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex items-center gap-1 border-b border-border", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "-mb-px border-b-2 border-transparent px-3 py-2 text-body-sm font-medium text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 data-[state=active]:border-primary data-[state=active]:text-text",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("pt-4 focus:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
```

- [ ] **Step 3: `stories/navigation.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const meta: Meta = { title: "Layout/Navigation" };
export default meta;
type Story = StoryObj;

export const Breadcrumbs: Story = {
  render: () => (
    <Breadcrumb items={[{ label: "생산관리", href: "#" }, { label: "작업지시", href: "#" }, { label: "WO-260709-014" }]} />
  ),
};

export const TabViews: Story = {
  render: () => (
    <Tabs defaultValue="list" style={{ width: 480 }}>
      <TabsList>
        <TabsTrigger value="list">리스트</TabsTrigger>
        <TabsTrigger value="kanban">칸반</TabsTrigger>
        <TabsTrigger value="gantt">간트</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><p className="text-body-sm text-text-muted">리스트 뷰(DataTable)</p></TabsContent>
      <TabsContent value="kanban"><p className="text-body-sm text-text-muted">칸반 뷰(WorkOrderCard)</p></TabsContent>
      <TabsContent value="gantt"><p className="text-body-sm text-text-muted">간트 뷰(후속)</p></TabsContent>
    </Tabs>
  ),
};
```

- [ ] **Step 4: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/breadcrumb.tsx components/ui/tabs.tsx stories/navigation.stories.tsx
git commit -m "feat: Breadcrumb + Tabs(Radix) + 스토리"
```

---

### Task 3: Dialog(Modal) + Drawer

**Files:** Create `components/ui/dialog.tsx`, `components/ui/drawer.tsx`, `stories/overlay.stories.tsx`.

- [ ] **Step 1: `components/ui/dialog.tsx`**
```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/50", className)} {...props} />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-5 shadow-modal focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md text-text-faint transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <X size={18} aria-hidden />
        <span className="sr-only">닫기</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1", className)} {...props} />;
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-subtitle font-semibold text-text", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-body-sm text-text-muted", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5 flex justify-end gap-2", className)} {...props} />;
}
```

- [ ] **Step 2: `components/ui/drawer.tsx`** (우측 슬라이드, Radix Dialog 기반)
```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-modal focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md text-text-faint transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <X size={18} aria-hidden />
        <span className="sr-only">닫기</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DrawerContent.displayName = "DrawerContent";

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-border px-5 py-4", className)} {...props} />;
}

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-subtitle font-semibold text-text", className)} {...props} />
));
DrawerTitle.displayName = "DrawerTitle";

export function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto p-5", className)} {...props} />;
}
```

- [ ] **Step 3: `stories/overlay.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const meta: Meta = { title: "Layout/Overlay" };
export default meta;
type Story = StoryObj;

export const Modal: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild><Button>작업지시 취소</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>작업지시 취소</DialogTitle>
          <DialogDescription>WO-260709-014를 취소합니다. 이 작업은 되돌릴 수 없습니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="secondary">돌아가기</Button></DialogClose>
          <DialogClose asChild><Button variant="danger">취소 확정</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const SideDrawer: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild><Button variant="secondary">상세 보기</Button></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>WO-260709-014 상세</DrawerTitle></DrawerHeader>
        <DrawerBody><p className="text-body-sm text-text-muted">공정·검사·수불 상세가 표시됩니다.</p></DrawerBody>
      </DrawerContent>
    </Drawer>
  ),
};
```

- [ ] **Step 4: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/dialog.tsx components/ui/drawer.tsx stories/overlay.stories.tsx
git commit -m "feat: Dialog(Modal) + Drawer(우측 슬라이드, Radix) + 스토리"
```

---

### Task 4: Toast (Radix) + useToast — 동작 테스트 포함

**Files:** Create `components/ui/toast.tsx`, `components/ui/toast.test.tsx`, `stories/toast.stories.tsx`.

- [ ] **Step 1: 실패하는 테스트 (`components/ui/toast.test.tsx`)**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Trigger() {
  const { toast } = useToast();
  return <button onClick={() => toast({ title: "저장됨", description: "실적이 등록되었습니다." })}>등록</button>;
}

describe("useToast", () => {
  it("toast 호출 시 화면에 표시된다", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "등록" }));
    expect(await screen.findByText("저장됨")).toBeInTheDocument();
    expect(screen.getByText("실적이 등록되었습니다.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**
Run `npm test -- components/ui/toast.test.tsx` → FAIL(모듈 없음).

- [ ] **Step 3: `components/ui/toast.tsx`**
```tsx
"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastCtx {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ACCENT: Record<Tone, string> = {
  primary: "border-l-primary",
  ok: "border-l-ok",
  warn: "border-l-warn",
  crit: "border-l-crit",
  info: "border-l-info",
  neutral: "border-l-neutral",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((opts: ToastOptions) => {
    idRef.current += 1;
    setItems((prev) => [...prev, { id: idRef.current, ...opts }]);
  }, []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => { if (!open) remove(t.id); }}
            className={cn(
              "flex items-start gap-3 rounded-md border border-l-4 border-border bg-elevated px-4 py-3 shadow-modal",
              ACCENT[t.tone ?? "neutral"],
            )}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-body-sm font-semibold text-text">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 text-caption text-text-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-text-faint transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="닫기">
              <X size={16} aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**
Run `npm test -- components/ui/toast.test.tsx` → PASS(1 passed).

- [ ] **Step 5: `stories/toast.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

function Demo() {
  const { toast } = useToast();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={() => toast({ title: "저장됨", description: "실적이 등록되었습니다.", tone: "ok" })}>성공</Button>
      <Button variant="secondary" onClick={() => toast({ title: "안전재고 미달", description: "SUS-304 180/250", tone: "warn" })}>경고</Button>
      <Button variant="danger" onClick={() => toast({ title: "설비 정지", description: "CNC-03 주축 과부하", tone: "crit" })}>이상</Button>
    </div>
  );
}

const meta: Meta = { title: "Layout/Toast" };
export default meta;
type Story = StoryObj;

export const Triggers: Story = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
};
```

- [ ] **Step 6: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/toast.tsx components/ui/toast.test.tsx stories/toast.stories.tsx
git commit -m "feat: Toast(Radix) + useToast/ToastProvider(의미색 tone) + 테스트/스토리"
```

---

### Task 5: ConnectionBadge + Clock — formatClock 테스트 포함

**Files:** Create `components/ui/connection-badge.tsx`, `components/ui/clock.tsx`, `components/ui/clock.test.ts`, `stories/status-indicators.stories.tsx`.

- [ ] **Step 1: 실패하는 테스트 (`components/ui/clock.test.ts`)**
```ts
import { describe, it, expect } from "vitest";
import { formatClock } from "@/components/ui/clock";

describe("formatClock", () => {
  it("HH:MM:SS로 0 패딩한다", () => {
    expect(formatClock(new Date(2026, 6, 9, 9, 5, 3))).toBe("09:05:03");
  });
  it("오후 시간을 24시간제로 표기한다", () => {
    expect(formatClock(new Date(2026, 6, 9, 14, 32, 7))).toBe("14:32:07");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**
Run `npm test -- components/ui/clock.test.ts` → FAIL(모듈 없음).

- [ ] **Step 3: `components/ui/clock.tsx`**
```tsx
"use client";

import * as React from "react";
import { Clock as ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Date → "HH:MM:SS"(24시간, 0 패딩) */
export function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function Clock({ className }: { className?: string }) {
  const [time, setTime] = React.useState<string>("");
  React.useEffect(() => {
    const tick = () => setTime(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={cn("num inline-flex items-center gap-1.5 text-body-sm text-text-muted", className)} suppressHydrationWarning>
      <ClockIcon size={14} aria-hidden />
      {time}
    </span>
  );
}
```

- [ ] **Step 4: `components/ui/connection-badge.tsx`**
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

const MAP: Record<ConnectionStatus, { dot: string; text: string; bg: string; defaultLabel: string }> = {
  connected: { dot: "bg-ok", text: "text-ok", bg: "bg-ok-soft", defaultLabel: "연결됨" },
  disconnected: { dot: "bg-crit", text: "text-crit", bg: "bg-crit-soft", defaultLabel: "연결 끊김" },
  reconnecting: { dot: "bg-warn", text: "text-warn", bg: "bg-warn-soft", defaultLabel: "재연결 중" },
};

export interface ConnectionBadgeProps {
  status: ConnectionStatus;
  label?: string;
  className?: string;
}

export function ConnectionBadge({ status, label, className }: ConnectionBadgeProps) {
  const s = MAP[status];
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold", s.bg, s.text, className)}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", s.dot, status === "reconnecting" && "animate-pulse")}
        aria-hidden
      />
      {label ?? s.defaultLabel}
    </span>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**
Run `npm test -- components/ui/clock.test.ts` → PASS(2 passed).

- [ ] **Step 6: `stories/status-indicators.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ConnectionBadge } from "@/components/ui/connection-badge";
import { Clock } from "@/components/ui/clock";

const meta: Meta = { title: "Layout/StatusIndicators" };
export default meta;
type Story = StoryObj;

export const Connection: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 10 }}>
      <ConnectionBadge status="connected" label="PLC 연결됨" />
      <ConnectionBadge status="reconnecting" />
      <ConnectionBadge status="disconnected" />
    </div>
  ),
};

export const LiveClock: Story = { render: () => <Clock /> };
```

- [ ] **Step 7: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/connection-badge.tsx components/ui/clock.tsx components/ui/clock.test.ts stories/status-indicators.stories.tsx
git commit -m "feat: ConnectionBadge + Clock(formatClock 테스트) + 스토리"
```

---

### Task 6: AppShell (SidebarNav + Topbar)

**Files:** Create `components/ui/app-shell.tsx`, `stories/app-shell.stories.tsx`.

- [ ] **Step 1: `components/ui/app-shell.tsx`**
```tsx
import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── AppShell: 사이드바 + 톱바 + 콘텐츠 Grid ── */
export function AppShell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-border bg-surface md:flex">
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg/90 px-5 py-2.5 backdrop-blur">
          {topbar}
        </header>
        <main className="w-full max-w-[1380px] px-6 pb-12 pt-5">{children}</main>
      </div>
    </div>
  );
}

/* ── SidebarNav ── */
export interface SideNavItem {
  label: string;
  icon?: LucideIcon;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}
export interface SideNavGroup {
  label: string;
  items: SideNavItem[];
}

export function SidebarNav({
  brand,
  groups,
  footer,
}: {
  brand: React.ReactNode;
  groups: SideNavGroup[];
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-4 text-subtitle font-bold text-text">
        {brand}
      </div>
      <nav className="flex flex-1 flex-col gap-4 p-2.5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-2 pb-1.5 text-label font-semibold uppercase tracking-wide text-text-faint">{g.label}</p>
            {g.items.map((it) => {
              const Icon = it.icon;
              const cls = cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-body-sm transition",
                it.active ? "bg-primary-soft font-semibold text-primary" : "text-text-muted hover:bg-elevated hover:text-text",
              );
              const content = (
                <>
                  {Icon && <Icon size={16} aria-hidden />}
                  {it.label}
                </>
              );
              return it.href ? (
                <a key={it.label} href={it.href} className={cls} aria-current={it.active ? "page" : undefined}>
                  {content}
                </a>
              ) : (
                <button key={it.label} type="button" onClick={it.onClick} className={cn(cls, "w-full text-left")} aria-current={it.active ? "page" : undefined}>
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-border p-2.5">{footer}</div>}
    </>
  );
}

/* ── Topbar: 좌측(브레드크럼 등) + 우측 슬롯 ── */
export function Topbar({ children, right }: { children?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </>
  );
}
```

- [ ] **Step 2: `stories/app-shell.stories.tsx`**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { LayoutDashboard, Factory, PackageSearch, Boxes, Wrench, Database } from "lucide-react";
import { AppShell, SidebarNav, Topbar } from "@/components/ui/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ConnectionBadge } from "@/components/ui/connection-badge";
import { Clock } from "@/components/ui/clock";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionHeader } from "@/components/ui/section-header";

const groups = [
  { label: "대시보드", items: [{ label: "통합 현황", icon: LayoutDashboard, href: "#", active: true }] },
  { label: "생산관리", items: [{ label: "생산계획", icon: Factory, href: "#" }, { label: "작업지시", icon: Factory, href: "#" }, { label: "생산실적", icon: Factory, href: "#" }] },
  { label: "품질·추적", items: [{ label: "Lot 추적", icon: PackageSearch, href: "#" }, { label: "검사·부적합", icon: PackageSearch, href: "#" }] },
  { label: "재고관리", items: [{ label: "재고 현황", icon: Boxes, href: "#" }] },
  { label: "설비관리", items: [{ label: "설비 정비", icon: Wrench, href: "#" }] },
  { label: "기준정보", items: [{ label: "품목 / BOM", icon: Database, href: "#" }] },
];

const meta: Meta = { title: "Layout/AppShell", parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj;

export const Full: Story = {
  render: () => (
    <AppShell
      sidebar={<SidebarNav brand={<><span>▤</span> 스마트 MES</>} groups={groups} footer={<a href="#" className="block rounded-md border border-border px-3 py-2 text-center text-body-sm text-text-muted">🖥 현장 키오스크</a>} />}
      topbar={
        <Topbar
          right={<><ConnectionBadge status="connected" label="PLC 연결됨" /><Clock /><ThemeToggle /></>}
        >
          <Breadcrumb items={[{ label: "대시보드", href: "#" }, { label: "통합 현황" }]} />
        </Topbar>
      }
    >
      <SectionHeader title="생산 통합 현황" description="2공장 · 실시간 POP" />
      <p className="text-body-sm text-text-muted">여기에 KPI 타일·DataTable 등 콘텐츠가 조립됩니다.</p>
    </AppShell>
  ),
};
```

- [ ] **Step 3: 검증 + Commit**
Run `npm run build-storybook -- --disable-telemetry` (성공), `npx tsc --noEmit` (클린).
```bash
git add components/ui/app-shell.tsx stories/app-shell.stories.tsx
git commit -m "feat: AppShell(사이드바 GNB + 스티키 톱바 + 콘텐츠) + SidebarNav/Topbar + 스토리"
```

---

### Task 7: 배럴 확장 + 전체 검증

**Files:** Modify `components/ui/index.ts`.

- [ ] **Step 1: `components/ui/index.ts`에 레이아웃 계층 export 추가**
기존 export 아래에 추가:
```ts
export { Card, CardHeader, CardTitle, CardContent } from "./card";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
export { Breadcrumb, type Crumb, type BreadcrumbProps } from "./breadcrumb";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export {
  Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "./dialog";
export {
  Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody,
} from "./drawer";
export { ToastProvider, useToast, type ToastOptions } from "./toast";
export { ConnectionBadge, type ConnectionStatus, type ConnectionBadgeProps } from "./connection-badge";
export { Clock, formatClock } from "./clock";
export {
  AppShell, SidebarNav, Topbar, type SideNavItem, type SideNavGroup,
} from "./app-shell";
```
각 export명이 실제 파일 export와 일치하는지 확인 후 확정(불일치 시 배럴을 실제에 맞춰 수정하고 보고).

- [ ] **Step 2: 전체 검증**
Run `npm test` → 모든 테스트 통과 (D1-B 32 + toast 1 + clock 2 = 35 passed). 정확 카운트 보고.
Run `npx tsc --noEmit` → 타입 에러 0.
Run `npm run build-storybook -- --disable-telemetry` → 성공, Layout/* 스토리(Card·Navigation·Overlay·Toast·StatusIndicators·AppShell) 포함.
Run `npm run build` → Next.js 빌드 성공.
실패 시 STOP·BLOCKED 보고.

- [ ] **Step 3: Commit**
```bash
git add components/ui/index.ts
git commit -m "chore: 레이아웃 계층 배럴 export + D1-C 전체 검증"
```

---

## Self-Review 결과

**Spec 커버리지 (스펙 §6.3 레이아웃/네비):**
- AppShell(사이드바 GNB + 톱바) → Task 6 ✅ / SidebarNav·Topbar 포함
- Breadcrumb → Task 2 ✅ / Tabs → Task 2 ✅
- Card/Panel → Task 1 ✅ / SectionHeader → Task 1 ✅
- Modal(Dialog) → Task 3 ✅ / Drawer → Task 3 ✅
- Toast → Task 4 ✅ / ConnectionBadge → Task 5 ✅ / Clock → Task 5 ✅
- 각 스토리 다크/라이트: withTheme 데코레이터 공통 제공 ✅
- `/a11y`: Radix(포커스 트랩·ESC·ARIA) + addon-a11y 자동 점검 + breadcrumb aria-current·nav / connection role=status

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드 포함.

**타입 일관성:** `Tone`(status-pill) → Toast ACCENT에서 재사용. `formatClock`(Task 5) 시그니처 테스트·컴포넌트 동일. Dialog/Drawer 모두 Radix Dialog 기반이나 별도 export명으로 충돌 없음. AppShell 스토리가 Breadcrumb·ConnectionBadge·Clock·ThemeToggle·SectionHeader 실제 조립. 배럴 export명은 Task 7에서 실제와 대조.

**동시성:** 리뷰·구현 직렬 진행. 리뷰 에이전트는 체크아웃/파일이동 금지, 현재 HEAD만 대상.

**범위:** D1-C 레이아웃 계층만. MES 특화(WorkOrderCard·GenealogyTree·Stepper·GaugeTile·KioskStepper)=D1-D. 단독 테스트·빌드 가능한 완결 단위.
