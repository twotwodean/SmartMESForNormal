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

## 테스트

### 단위 테스트
```bash
npm test            # Vitest, 113개
```
`lib/`, `app/api/**` 등 도메인 로직·서비스 계층을 커버한다. `prisma/dev.db`를 건드리지 않는다(주로 순수 함수/서비스 단위 테스트).

### E2E 테스트 (Playwright)
```bash
npm run test:e2e     # 헤드리스 전체 실행, 14개
npm run test:e2e:ui  # UI 모드로 디버깅
```
- 전용 DB(`e2e.db`)에서 동작 — `playwright.config.ts`의 `globalSetup`(`e2e/global-setup.ts`)이 실행 전 `DATABASE_URL="file:./e2e.db"`로 `prisma migrate deploy` + `db:seed`를 수행해 `dev.db`와 완전히 분리한다.
- SQLite 특성상 `workers: 1`(직렬 실행)로 고정.
- 로컬에서는 `npm run dev`를, CI에서는 (빌드 산출물 기반) `npm run start`를 웹서버로 자동 기동한다.
- 커버리지: 로그인/리다이렉트(`auth`), 생산실적→재고(`production`), 입고·출하·반품(`logistics`), 청구·수금(`billing`), MRP 순소요(`mrp`), viewer 권한 차단(`rbac`).

### 합성 데이터 생성기
```bash
npm run db:synth     # 기본 규모(품목 2,000 / 수불 5만 / 작업지시 2,000 / 수주 1,000)
```
- env 파라미터로 규모 조절: `SYNTH_ITEMS`, `SYNTH_TXNS`, `SYNTH_WORK_ORDERS`, `SYNTH_SALES_ORDERS`.
- 실행 시간이 걸리고 DB 용량이 커지므로 **사본 DB에 실행 권장**:
  ```bash
  SYNTH_ITEMS=100 DATABASE_URL="file:./synth-smoke.db" npx tsx scripts/synth.ts
  ```
- 기존 seed 데이터 위에 `SYN-` 접두 코드로 대량 데이터를 append한다(seed 계정/기준정보는 보존).

### 테스트 계정
| 계정 | 비밀번호 | 역할 |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `operator` | `oper123` | OPERATOR |
| `viewer` | `view123` | VIEWER |

### CI 게이트
`.github/workflows/ci.yml` — `main`/`feature/**` push와 `main` 대상 PR에서 자동 실행:

`npm ci` → `prisma generate` → `prisma migrate deploy`(`ci.db`) → `db:seed` → `npm test` → `npm run build` → Playwright 브라우저 설치 → `npm run test:e2e`(전용 `e2e.db`, CI 모드). 실패 시 `playwright-report`를 아티팩트로 업로드한다. 단위·빌드·E2E 중 하나라도 실패하면 게이트가 막힌다(PR 머지 전 필수 확인).
