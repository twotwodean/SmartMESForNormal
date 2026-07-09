# D0 디자인 토큰 & 툴링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다크 기본 테마·의미색 토큰이 적용된 Next.js 14 + Tailwind + Storybook 프로젝트를 부팅 가능·테스트 가능한 상태로 세운다 (D0 완료 기준 충족).

**Architecture:** 토큰의 단일 진실원(single source of truth)은 `lib/design-tokens.ts`의 TS 상수. 이를 `globals.css`의 CSS 변수(다크/라이트/system)와 `tailwind.config.ts`가 참조한다. 테마 전환은 `lib/theme.ts`의 순수 함수(다음 테마 계산·localStorage 키)로 로직을 분리하고, `ThemeToggle` 컴포넌트가 이를 사용한다. 컴포넌트/토큰은 Storybook에서 다크/라이트 데코레이터로 격리 확인한다.

**Tech Stack:** Next.js 14 (App Router), TypeScript 5.2, Tailwind CSS 3.4, Storybook 8 (Vite), Vitest, next/font/local (Pretendard), lucide-react.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json` | 의존성·스크립트 |
| `tsconfig.json` | TS 설정 + `@/*` 경로 별칭 |
| `next.config.mjs` | Next 설정 |
| `postcss.config.mjs` | Tailwind/postcss |
| `tailwind.config.ts` | 토큰을 `theme.extend`로 노출 (CSS 변수 참조) |
| `lib/design-tokens.ts` | 토큰 단일 진실원 (컬러 hex·간격·타이포 스케일). 순수 상수 |
| `lib/theme.ts` | 테마 순수 로직: 타입·상수·`nextTheme()`·`resolveTheme()` |
| `lib/theme.test.ts` | `lib/theme.ts` 단위테스트 |
| `lib/design-tokens.test.ts` | 토큰 무결성 단위테스트 |
| `app/globals.css` | CSS 변수(다크 기본 / `[data-theme]` / prefers-color-scheme) + base |
| `app/layout.tsx` | 루트 레이아웃, Pretendard 로컬 폰트, 테마 초기화 스크립트 |
| `app/page.tsx` | 토큰 확인용 임시 랜딩 (테마 토글 포함) |
| `components/theme-toggle.tsx` | 테마 토글 버튼 (lucide 아이콘) |
| `public/fonts/PretendardVariable.woff2` | 로컬 번들 폰트 |
| `.storybook/main.ts` | Storybook 설정 (Vite, stories glob) |
| `.storybook/preview.tsx` | globals.css import + 다크/라이트 배경 데코레이터 |
| `stories/tokens.stories.tsx` | 토큰(컬러·의미색·타이포) 쇼케이스 스토리 |
| `vitest.config.ts` | Vitest 설정 |
| `.gitignore` | (이미 존재) node_modules 등 |
| `README.md` | 실행 방법·구조 |

---

### Task 1: 프로젝트 스캐폴딩 (의존성·설정)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `next-env.d.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "smartmes",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "lucide-react": "0.417.0"
  },
  "devDependencies": {
    "@storybook/addon-essentials": "8.2.6",
    "@storybook/blocks": "8.2.6",
    "@storybook/react": "8.2.6",
    "@storybook/react-vite": "8.2.6",
    "@types/node": "20.14.11",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@vitejs/plugin-react": "4.3.1",
    "autoprefixer": "10.4.19",
    "postcss": "8.4.40",
    "storybook": "8.2.6",
    "tailwindcss": "3.4.7",
    "typescript": "5.2.2",
    "vitest": "2.0.4"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.mjs, postcss.config.mjs, next-env.d.ts 작성**

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`next-env.d.ts`:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 4: 의존성 설치**

Run: `npm install`
Expected: `node_modules/` 생성, 오류 없이 완료. (경고는 무방)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs next-env.d.ts
git commit -m "chore: Next.js 14 + Storybook 프로젝트 스캐폴딩"
```

---

### Task 2: 토큰 단일 진실원 (`lib/design-tokens.ts`) — TDD

**Files:**
- Create: `lib/design-tokens.ts`
- Test: `lib/design-tokens.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: vitest.config.ts 작성**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 2: 실패하는 테스트 작성 (`lib/design-tokens.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { SEMANTIC_COLORS, SPACING_SCALE, TYPE_SCALE } from "@/lib/design-tokens";

describe("design tokens", () => {
  it("의미색 6종을 다크/라이트 hex로 정의한다", () => {
    const keys = ["primary", "ok", "warn", "crit", "info", "neutral"] as const;
    for (const k of keys) {
      expect(SEMANTIC_COLORS[k].dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(SEMANTIC_COLORS[k].light).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("primary 값이 확정 스펙과 일치한다", () => {
    expect(SEMANTIC_COLORS.primary.dark).toBe("#3B82F6");
    expect(SEMANTIC_COLORS.primary.light).toBe("#2563EB");
  });

  it("간격 스케일은 4px 기반 오름차순이다", () => {
    expect(SPACING_SCALE).toEqual([4, 8, 12, 16, 24, 32, 48]);
  });

  it("타이포 스케일은 label~h1을 포함한다", () => {
    expect(TYPE_SCALE.label).toBe(11);
    expect(TYPE_SCALE.h1).toBe(30);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- lib/design-tokens.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/design-tokens"` (파일 없음)

- [ ] **Step 4: `lib/design-tokens.ts` 구현**

```ts
// 디자인 토큰 단일 진실원. globals.css / tailwind.config.ts가 이 값을 참조한다.

export const NEUTRAL_COLORS = {
  dark: {
    bg: "#0B0F14",
    surface: "#121821",
    elevated: "#1A2230",
    border: "#26303D",
    text: "#E2E8F0",
    "text-muted": "#94A3B8",
    "text-faint": "#64748B",
  },
  light: {
    bg: "#F6F8FA",
    surface: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E3E8EF",
    text: "#0F172A",
    "text-muted": "#52607A",
    "text-faint": "#8A97AD",
  },
} as const;

export const SEMANTIC_COLORS = {
  primary: { dark: "#3B82F6", light: "#2563EB", darkSoft: "#17233C", lightSoft: "#E5EDFF" },
  ok: { dark: "#22C55E", light: "#16A34A", darkSoft: "#12281B", lightSoft: "#DCFCE7" },
  warn: { dark: "#F59E0B", light: "#D97706", darkSoft: "#2B2110", lightSoft: "#FEF3C7" },
  crit: { dark: "#EF4444", light: "#DC2626", darkSoft: "#2B1414", lightSoft: "#FEE2E2" },
  info: { dark: "#38BDF8", light: "#0EA5E9", darkSoft: "#0E2430", lightSoft: "#E0F2FE" },
  neutral: { dark: "#64748B", light: "#64748B", darkSoft: "#1B2430", lightSoft: "#EEF2F7" },
} as const;

export const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48] as const;

export const RADIUS = { sm: 4, md: 6, lg: 8 } as const;

export const TYPE_SCALE = {
  label: 11,
  caption: 12,
  "body-sm": 13,
  body: 14,
  subtitle: 16,
  h3: 20,
  h2: 24,
  h1: 30,
} as const;

// 상태 → 의미색 매핑 (고정). UI 컴포넌트가 참조.
export const STATUS_COLOR = {
  wo: { WAITING: "warn", RUNNING: "primary", DONE: "ok", CANCELLED: "neutral" },
  equipment: { RUN: "ok", STOP: "neutral", REPAIR: "crit" },
  inspection: { PASS: "ok", FAIL: "crit", SPECIAL: "warn" },
  stock: { NORMAL: "neutral", BELOW: "warn", NEGATIVE: "crit" },
} as const;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- lib/design-tokens.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 6: Commit**

```bash
git add lib/design-tokens.ts lib/design-tokens.test.ts vitest.config.ts
git commit -m "feat: 디자인 토큰 단일 진실원 + 무결성 테스트"
```

---

### Task 3: 테마 순수 로직 (`lib/theme.ts`) — TDD

**Files:**
- Create: `lib/theme.ts`
- Test: `lib/theme.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (`lib/theme.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { THEME_STORAGE_KEY, DEFAULT_THEME, nextTheme, isTheme } from "@/lib/theme";

describe("theme logic", () => {
  it("기본 테마는 dark 이다", () => {
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("스토리지 키가 정의되어 있다", () => {
    expect(THEME_STORAGE_KEY).toBe("smartmes-theme");
  });

  it("nextTheme는 dark/light를 토글한다", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });

  it("isTheme는 유효한 값만 통과시킨다", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("blue")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/theme.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/theme"`

- [ ] **Step 3: `lib/theme.ts` 구현**

```ts
export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "smartmes-theme";
export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

/** 저장값 > 없으면 기본(dark). SSR/CSR 공통 사용. */
export function resolveTheme(stored: unknown): Theme {
  return isTheme(stored) ? stored : DEFAULT_THEME;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/theme.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add lib/theme.ts lib/theme.test.ts
git commit -m "feat: 테마 순수 로직(nextTheme/resolveTheme) + 테스트"
```

---

### Task 4: Tailwind 설정 + globals.css (토큰 → CSS 변수)

**Files:**
- Create: `tailwind.config.ts`
- Create: `app/globals.css`

- [ ] **Step 1: `tailwind.config.ts` 작성 (CSS 변수 참조)**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./stories/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        text: { DEFAULT: "var(--text)", muted: "var(--muted)", faint: "var(--faint)" },
        primary: { DEFAULT: "var(--primary)", fg: "var(--primary-fg)", soft: "var(--primary-soft)" },
        ok: { DEFAULT: "var(--ok)", soft: "var(--ok-soft)" },
        warn: { DEFAULT: "var(--warn)", soft: "var(--warn-soft)" },
        crit: { DEFAULT: "var(--crit)", soft: "var(--crit-soft)" },
        info: { DEFAULT: "var(--info)", soft: "var(--info-soft)" },
        neutral: { DEFAULT: "var(--neutral)", soft: "var(--neutral-soft)" },
      },
      borderRadius: { sm: "4px", md: "6px", lg: "8px" },
      fontFamily: { sans: ["var(--font-pretendard)", "system-ui", "sans-serif"] },
      fontSize: {
        label: "11px", caption: "12px", "body-sm": "13px", body: "14px",
        subtitle: "16px", h3: "20px", h2: "24px", h1: "30px",
      },
      boxShadow: {
        card: "var(--shadow)",
        modal: "var(--shadow-lg)",
      },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: `app/globals.css` 작성 (다크 기본 + data-theme + prefers)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 다크 기본 */
:root {
  --bg: #0B0F14; --surface: #121821; --elevated: #1A2230; --border: #26303D;
  --text: #E2E8F0; --muted: #94A3B8; --faint: #64748B;
  --primary: #3B82F6; --primary-fg: #FFFFFF; --primary-soft: #17233C;
  --ok: #22C55E; --warn: #F59E0B; --crit: #EF4444; --info: #38BDF8; --neutral: #64748B;
  --ok-soft: #12281B; --warn-soft: #2B2110; --crit-soft: #2B1414; --info-soft: #0E2430; --neutral-soft: #1B2430;
  --shadow: none; --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
}

/* 사용자가 명시적으로 라이트를 고르지 않았고 OS가 라이트면 라이트 */
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    --bg: #F6F8FA; --surface: #FFFFFF; --elevated: #FFFFFF; --border: #E3E8EF;
    --text: #0F172A; --muted: #52607A; --faint: #8A97AD;
    --primary: #2563EB; --primary-soft: #E5EDFF;
    --ok: #16A34A; --warn: #D97706; --crit: #DC2626; --info: #0EA5E9; --neutral: #64748B;
    --ok-soft: #DCFCE7; --warn-soft: #FEF3C7; --crit-soft: #FEE2E2; --info-soft: #E0F2FE; --neutral-soft: #EEF2F7;
    --shadow: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04); --shadow-lg: 0 8px 28px rgba(15,23,42,.14);
  }
}

:root[data-theme="dark"] {
  --bg: #0B0F14; --surface: #121821; --elevated: #1A2230; --border: #26303D;
  --text: #E2E8F0; --muted: #94A3B8; --faint: #64748B;
  --primary: #3B82F6; --primary-fg: #FFFFFF; --primary-soft: #17233C;
  --ok: #22C55E; --warn: #F59E0B; --crit: #EF4444; --info: #38BDF8; --neutral: #64748B;
  --ok-soft: #12281B; --warn-soft: #2B2110; --crit-soft: #2B1414; --info-soft: #0E2430; --neutral-soft: #1B2430;
  --shadow: none; --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
}

:root[data-theme="light"] {
  --bg: #F6F8FA; --surface: #FFFFFF; --elevated: #FFFFFF; --border: #E3E8EF;
  --text: #0F172A; --muted: #52607A; --faint: #8A97AD;
  --primary: #2563EB; --primary-fg: #FFFFFF; --primary-soft: #E5EDFF;
  --ok: #16A34A; --warn: #D97706; --crit: #DC2626; --info: #0EA5E9; --neutral: #64748B;
  --ok-soft: #DCFCE7; --warn-soft: #FEF3C7; --crit-soft: #FEE2E2; --info-soft: #E0F2FE; --neutral-soft: #EEF2F7;
  --shadow: 0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04); --shadow-lg: 0 8px 28px rgba(15,23,42,.14);
}

* { box-sizing: border-box; }
html, body { padding: 0; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-pretendard), system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.num { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: Tailwind 토큰 확장 + globals.css(다크 기본/라이트/system)"
```

---

### Task 5: Pretendard 로컬 번들 + 루트 레이아웃

**Files:**
- Create: `public/fonts/PretendardVariable.woff2` (다운로드)
- Create: `app/layout.tsx`

- [ ] **Step 1: Pretendard woff2 다운로드**

Run (bash):
```bash
mkdir -p public/fonts && curl -L -o public/fonts/PretendardVariable.woff2 \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2
```
Expected: `public/fonts/PretendardVariable.woff2` 생성 (수백 KB). 파일 크기 > 0 확인: `ls -l public/fonts/PretendardVariable.woff2`

> 네트워크 불가 시: Pretendard 릴리스(https://github.com/orioncactus/pretendard/releases)에서 `PretendardVariable.woff2`를 수동으로 받아 같은 경로에 둔다.

- [ ] **Step 2: `app/layout.tsx` 작성 (next/font local + 테마 초기화 스크립트)**

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "SmartMES — 범용 제조 MES",
  description: "도메인 중립 웹 MES 디자인 시스템",
};

// 하이드레이션 전에 저장된 테마를 적용해 깜빡임(FOUC) 방지
const themeInit = `(function(){try{var t=localStorage.getItem("smartmes-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add public/fonts/PretendardVariable.woff2 app/layout.tsx
git commit -m "feat: Pretendard 로컬 번들 + 루트 레이아웃(FOUC 방지 테마 초기화)"
```

---

### Task 6: 테마 토글 컴포넌트 + 확인용 랜딩

**Files:**
- Create: `components/theme-toggle.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: `components/theme-toggle.tsx` 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { type Theme, THEME_STORAGE_KEY, DEFAULT_THEME, nextTheme, isTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) setTheme(stored);
  }, []);

  function toggle() {
    const next = nextTheme(theme);
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-body-sm text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      테마
    </button>
  );
}
```

- [ ] **Step 2: `app/page.tsx` 작성 (토큰 확인용 임시 화면)**

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

const SEMANTIC = [
  { key: "primary", label: "Primary" },
  { key: "ok", label: "정상/완료" },
  { key: "warn", label: "주의/대기" },
  { key: "crit", label: "이상/불량" },
  { key: "info", label: "정보/이동" },
  { key: "neutral", label: "계획/취소" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold">SmartMES 디자인 토큰</h1>
          <p className="text-body-sm text-text-muted">D0 — 다크 기본 · 라이트 전환 · Pretendard</p>
        </div>
        <ThemeToggle />
      </header>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-faint">의미색</h2>
        <div className="flex flex-wrap gap-3">
          {SEMANTIC.map((s) => (
            <div key={s.key} className="w-20">
              <div className={`h-10 rounded-md border border-border bg-${s.key}`} />
              <span className="mt-1 block text-label text-text-muted">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="num mt-4 text-body-sm text-text-muted">tabular-nums 확인: 1,200 · 92.4% · WO-260709-014</p>
      </section>
    </main>
  );
}
```

> 참고: 위 `bg-${s.key}` 동적 클래스가 Tailwind purge에 안전하도록, `tailwind.config.ts`의 `content` glob이 `stories`·`components`·`app`을 포함하고 클래스명이 문자열로 존재해야 한다. 안전을 위해 `safelist`가 필요하면 config에 `safelist: ["bg-primary","bg-ok","bg-warn","bg-crit","bg-info","bg-neutral"]`를 추가한다.

- [ ] **Step 3: `tailwind.config.ts`에 safelist 추가**

`plugins: [],` 위에 삽입:
```ts
  safelist: ["bg-primary", "bg-ok", "bg-warn", "bg-crit", "bg-info", "bg-neutral"],
```

- [ ] **Step 4: dev 서버로 시각 확인**

Run: `npm run dev`
Expected: `http://localhost:3001` 접속 시 다크 배경·의미색 스와치·Pretendard 폰트 렌더. "테마" 버튼 클릭 시 라이트/다크 전환되고 새로고침해도 유지됨. 확인 후 서버 종료(Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add components/theme-toggle.tsx app/page.tsx tailwind.config.ts
git commit -m "feat: 테마 토글 컴포넌트 + 토큰 확인 랜딩"
```

---

### Task 7: Storybook 부팅 + 토큰 쇼케이스 스토리

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.tsx`
- Create: `stories/tokens.stories.tsx`

- [ ] **Step 1: `.storybook/main.ts` 작성**

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
```

- [ ] **Step 2: `.storybook/preview.tsx` 작성 (globals.css + 다크/라이트 데코레이터)**

```tsx
import type { Preview, Decorator } from "@storybook/react";
import React, { useEffect } from "react";
import "../app/globals.css";

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "dark";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return React.createElement(
    "div",
    { style: { background: "var(--bg)", color: "var(--text)", padding: 24, minHeight: "100vh", fontFamily: "system-ui" } },
    React.createElement(Story),
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "테마",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "dark", title: "다크" },
          { value: "light", title: "라이트" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {},
};

export default preview;
```

- [ ] **Step 3: `stories/tokens.stories.tsx` 작성**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { SEMANTIC_COLORS, TYPE_SCALE } from "@/lib/design-tokens";

function Tokens() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--faint)" }}>의미색</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {Object.keys(SEMANTIC_COLORS).map((key) => (
            <div key={key} style={{ width: 76 }}>
              <div style={{ height: 40, borderRadius: 6, border: "1px solid var(--border)", background: `var(--${key})` }} />
              <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>{key}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--faint)" }}>타이포 스케일</h2>
        <div style={{ marginTop: 8 }}>
          {Object.entries(TYPE_SCALE).map(([name, size]) => (
            <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 12, borderBottom: "1px solid var(--border)", padding: "5px 0" }}>
              <span style={{ fontSize: 11, color: "var(--faint)", width: 84, fontFamily: "monospace" }}>{name} / {size}</span>
              <span style={{ fontSize: size }}>생산 통합 현황 12,340</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Tokens> = { title: "Foundations/Design Tokens", component: Tokens };
export default meta;
type Story = StoryObj<typeof Tokens>;
export const All: Story = {};
```

- [ ] **Step 4: Storybook 부팅 확인**

Run: `npm run storybook`
Expected: `http://localhost:6006` 에서 "Foundations/Design Tokens > All" 스토리 표시. 상단 툴바 Theme를 다크↔라이트 전환 시 배경·스와치·타이포가 바뀜. 확인 후 종료(Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add .storybook/main.ts .storybook/preview.tsx stories/tokens.stories.tsx
git commit -m "feat: Storybook 부팅 + 토큰 쇼케이스 스토리(다크/라이트 데코레이터)"
```

---

### Task 8: 검증 & README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 전체 테스트·빌드 검증**

Run: `npm test`
Expected: 모든 테스트 PASS (design-tokens 4 + theme 4 = 8 passed)

Run: `npm run build`
Expected: Next.js 프로덕션 빌드 성공 (오류 0). 경고는 무방.

- [ ] **Step 2: `README.md` 작성**

````markdown
# SmartMES — 범용 제조 MES

도메인 중립 웹 MES. 디자인 우선(design-first)으로 D0 토큰 → D1 컴포넌트 → D2 목업 순으로 구축한다.

## 스택
Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Storybook · Prisma+SQLite · lucide-react · Pretendard(로컬 번들)

## 실행
```bash
npm install
npm run dev         # http://localhost:3001
npm run storybook   # http://localhost:6006
npm test            # Vitest
npm run build       # 프로덕션 빌드
```

## 구조
- `app/` — 라우트·페이지 (App Router)
- `components/` — 재사용 UI 컴포넌트
- `lib/` — 유틸·서비스·토큰(`design-tokens.ts`)·테마 로직(`theme.ts`)
- `stories/` — Storybook 스토리
- `.storybook/` — Storybook 설정
- `public/fonts/` — Pretendard 로컬 번들
- `docs/` — SRS·디자인 브리프·스펙·플랜

## 테마
다크 기본. 우상단 "테마" 버튼으로 전환하며 localStorage(`smartmes-theme`)에 저장. OS `prefers-color-scheme`도 존중(미저장 시).

## 디자인 토큰
`lib/design-tokens.ts`가 단일 진실원. `app/globals.css`(CSS 변수)와 `tailwind.config.ts`가 이를 참조한다.
````

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README(실행 방법·구조·테마·토큰)"
```

---

## Self-Review 결과

**Spec 커버리지 (스펙 §5 D0 완료 기준):**
- tailwind.config + globals.css → Task 4 ✅
- 테마 토글 (다크 기본, localStorage) → Task 3(로직)+Task 6(UI)+Task 5(FOUC 초기화) ✅
- Pretendard 로컬 번들 → Task 5 ✅
- Storybook 부팅 + 토큰 참조 → Task 7 ✅
- 다크/라이트/system → Task 4(globals.css) ✅
- 의미색·상태매핑·타이포·간격 토큰 → Task 2 ✅

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드 포함.

**타입 일관성:** `Theme`("dark"|"light"), `THEME_STORAGE_KEY`("smartmes-theme"), `nextTheme`/`resolveTheme`/`isTheme`가 Task 3 정의 → Task 5·6에서 동일 시그니처로 사용 ✅. 토큰 키(primary/ok/warn/crit/info/neutral)가 Task 2·4·6·7에서 일관 ✅.

**범위:** D0(토큰·툴링)만 다룸. D1(컴포넌트)·D2(목업)는 별도 플랜. 단독으로 부팅·테스트·빌드 가능한 완결 단위 ✅.
