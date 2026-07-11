# 테스트 기반 구축 (E2E 스위트 + CI + 합성 데이터) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. dev 서버/포트 3001은 한 번에 하나만.

**Goal:** "실 운영하듯" 반복 테스트할 수 있는 기반 — ① Playwright E2E 정식 스위트(레포 커밋), ② GitHub Actions CI 게이트(lint→unit→build→E2E), ③ 실 규모 합성 데이터 생성기.

**Architecture:** E2E는 전용 테스트 DB(`file:./e2e.db`)에 대해 실행하여 dev.db를 보호. globalSetup에서 migrate+seed, 각 spec은 baseline 재시드 후 실 브라우저로 폐루프/RBAC 검증. 합성 생성기는 prisma createMany 배치로 대량 데이터 생성. CI는 unit+build+E2E 스모크를 PR 게이트화.

**Tech Stack:** @playwright/test, 기존 스택, GitHub Actions, tsx.

**주의:** 로그인 = POST `/api/auth/login`(username/password). 계정 admin/admin123, operator?(seed 확인), viewer/view123. 미들웨어가 `/mockups`,`/kiosk` 미인증 시 `/login` 리다이렉트. Prisma `DATABASE_URL` 교체로 DB 분리. E2E는 SQLite 특성상 `workers:1`(직렬).

---

## File Structure
| 파일 | 책임 |
|---|---|
| `playwright.config.ts` | testDir e2e, webServer, workers:1, baseURL, globalSetup |
| `e2e/global-setup.ts` | e2e.db migrate+seed |
| `e2e/helpers.ts` | loginAs(page, role), reseed() |
| `e2e/auth.spec.ts` | 리다이렉트·로그인·로그아웃 |
| `e2e/production.spec.ts` | POP 실적 → 재고 |
| `e2e/logistics.spec.ts` | 입고→재고+, 출하→재고−, 반품→재고+ |
| `e2e/billing.spec.ts` | 청구 부분수금→완납, 미수금 0 |
| `e2e/mrp.spec.ts` | RM-SUS304 순소요 770 / 구매 제안 |
| `e2e/rbac.spec.ts` | viewer 403(특채 승인·모델 등록·청구·수금) |
| `scripts/synth.ts` | 합성 데이터 생성기(품목/수불/오더 대량) |
| `.github/workflows/ci.yml` | CI: install→unit→build→e2e |
| `package.json` | (수정) test:e2e, db:synth 스크립트 + @playwright/test |
| `README.md` | (수정) 테스트 섹션 |

---

### Task 1: Playwright E2E 스위트 (설치·설정·spec·로컬 그린)

- [ ] **Step 1: 설치** — `npm i -D @playwright/test` 후 `npx playwright install chromium`(브라우저 바이너리). package.json scripts에 추가:
  - `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`.
- [ ] **Step 2: `playwright.config.ts`**
```ts
import { defineConfig } from "@playwright/test";

const PORT = 3001;
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,                 // SQLite 직렬 + 결정적
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DATABASE_URL: "file:./e2e.db", SESSION_SECRET: "e2e-secret" },
  },
});
```
- [ ] **Step 3: `e2e/global-setup.ts`** — e2e.db를 마이그레이션+시드(동일 DATABASE_URL). 
```ts
import { execSync } from "node:child_process";
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
```
- [ ] **Step 4: `e2e/helpers.ts`** — 계정/재시드 헬퍼. seed.ts에서 실제 계정(비번) 확인하여 CREDENTIALS 채울 것.
```ts
import { execSync } from "node:child_process";
import type { Page, APIRequestContext } from "@playwright/test";

export const CREDENTIALS = {
  admin: { username: "admin", password: "admin123" },
  operator: { username: "operator", password: "oper123" }, // seed에서 실제 값 확인·수정
  viewer: { username: "viewer", password: "view123" },
} as const;

/** API 로그인 후 세션 쿠키를 브라우저 컨텍스트에 주입 */
export async function loginAs(page: Page, role: keyof typeof CREDENTIALS) {
  const res = await page.request.post("/api/auth/login", { data: CREDENTIALS[role] });
  if (!res.ok()) throw new Error(`login failed: ${role} ${res.status()}`);
  // 쿠키는 request context에 저장됨 → 동일 컨텍스트의 page에 반영. 확인 위해 대시보드 방문.
  await page.goto("/mockups/dashboard");
}

/** baseline로 e2e.db 재시드(각 spec 독립성) */
export function reseed() {
  execSync("npx tsx prisma/seed.ts", { stdio: "ignore", env: { ...process.env, DATABASE_URL: "file:./e2e.db" } });
}
```
> 로그인 쿠키가 page context에 자동 공유되지 않으면(분리되면) UI 로그인(폼 채우기 → 제출)로 대체. 실제 login/page.tsx 필드명 확인하여 구현.

- [ ] **Step 5: spec 작성** — 각 파일 `test.describe.configure({ mode: "serial" })` + `test.beforeAll(reseed)`(변경계) 또는 beforeEach. 실제 화면 셀렉터/토스트 텍스트는 R3/R4 검증에서 확인된 값 사용:
  - `auth.spec.ts`: 비로그인 `/mockups/dashboard` → `/login` 리다이렉트; admin 로그인 → 대시보드 진입; 로그아웃 → 재접근 시 리다이렉트.
  - `production.spec.ts`: 작업실적(POP) 등록 → 해당 품목 재고가 예상만큼 증감(재고 화면 대조). (R1 폐루프)
  - `logistics.spec.ts`: 입고 처리 → 재고 +; 출하(SH-2607-001) → SHIPPED + 재고 −120; 반품 → 재고 복원.
  - `billing.spec.ts`: INV-2607-001 부분수금(700,000 수금) → 미수금 0 / 완납(PAID). 청구 발행(출하 미지정) → 목록 증가.
  - `mrp.spec.ts`: `/mockups/mrp`에서 RM-SUS304 행 총소요1200/현재고180/안전250/입고예정500/**순소요770**/제안 **구매**. FG-GB2500 제안 **생산**.
  - `rbac.spec.ts`: viewer 로그인 → 특채 승인·모델 등록·청구 발행·수금 시도 각각 403 토스트 "권한 없음", DB 미변경.
- [ ] **Step 6: 로컬 실행 → 그린** — dev 서버 없으면 config가 자동 기동. `npm run test:e2e` 전체 통과 확인(카운트 보고). 실패 시 셀렉터/로그인 방식 보정. `.gitignore`에 `e2e.db`, `test-results/`, `playwright-report/` 추가.
- [ ] **Step 7: Commit**
```bash
git add playwright.config.ts e2e .gitignore package.json package-lock.json
git commit -m "test: Playwright E2E 스위트(폐루프·MRP·RBAC) + 전용 e2e.db"
```

---

### Task 2: 합성 데이터 생성기

- [ ] **Step 1: `scripts/synth.ts`** — env 파라미터(기본값)로 대량 생성. prisma createMany 배치(1,000건 단위). 기존 seed 위에 append하되 코드 prefix `SYN-`로 구분. 규모 기본: 품목 2,000, BOM 링크 ~3,000, 재고 수불 50,000, 작업지시 2,000, 수주 1,000(상태 혼합). 생성 소요시간·건수 콘솔 요약. 실행 전 경고(대량; 사본 DB 권장). no any.
  - 핵심: `for` 배치 루프 + `prisma.$transaction` 또는 createMany. Item.type·uom·safetyStock 랜덤(단, Date.now/Math.random 사용 가능—여긴 워크플로 아님, 일반 tsx 스크립트라 무방). InventoryTxn IN/OUT/CONSUME 혼합으로 파생재고가 양수 유지되도록 IN 비중↑.
- [ ] **Step 2: package.json** — `"db:synth": "tsx scripts/synth.ts"`.
- [ ] **Step 3: 스모크 실행** — 소규모(env로 품목 50)로 1회 실행하여 성공·요약 확인(기본 대규모는 실행하지 말 것, 시간). `npx tsc --noEmit` 클린.
- [ ] **Step 4: Commit**
```bash
git add scripts/synth.ts package.json
git commit -m "test: 실 규모 합성 데이터 생성기(scripts/synth.ts, db:synth)"
```

---

### Task 3: CI 워크플로우 + README

- [ ] **Step 1: `.github/workflows/ci.yml`** — on push/PR(main, feature/**). Ubuntu, node 20, npm 캐시.
```yaml
name: CI
on:
  push: { branches: [main, "feature/**"] }
  pull_request: { branches: [main] }
jobs:
  build-test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: "file:./ci.db"
      SESSION_SECRET: "ci-secret"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npm run db:seed
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env: { CI: "true" }
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/, retention-days: 7 }
```
> `npm ci`는 package-lock.json 필요 — 없으면 생성 커밋하거나 `npm install`로 대체. E2E는 CI에서 `npm run start`(빌드 산출물) 사용(config).
- [ ] **Step 2: README.md 테스트 섹션 추가** — 단위(`npm test`), E2E(`npm run test:e2e`), 합성(`npm run db:synth`), 계정, e2e.db 격리 설명.
- [ ] **Step 3: 검증 + Commit** — yaml 문법 확인(들여쓰기). 
```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: PR 게이트(unit+build+e2e) + README 테스트 가이드"
```

---

### Task 4: 최종 검증
- [ ] `npm test`(단위 유지) → `npm run test:e2e`(전체 그린, 카운트) → `npx tsc --noEmit` → `npm run build`. dev.db가 E2E로 오염되지 않았는지 확인(e2e.db 분리). 결과 보고.

---

## Self-Review 결과
**커버리지:** E2E(auth/production/logistics/billing/mrp/rbac) + 합성 생성기 + CI 게이트 → "실운영 반복 테스트 기반" 확보 ✅.
**주의:** SQLite → workers:1. e2e.db/ci.db 분리로 dev.db 보호. 로그인 쿠키 공유 방식은 실제 확인 후 UI 로그인 대체 가능. operator 계정 비번은 seed에서 실측. package-lock 여부 확인.
**범위:** 테스트 기반. 이후 여기서 나온 이슈로 P0(기준정보 CRUD·zod·error 경계·rate-limit·낙관적 락·PostgreSQL) 진행.
