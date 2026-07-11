# SmartMES — 범용 제조 MES

도메인 중립 웹 MES. 디자인 우선(design-first)으로 D0 토큰 → D1 컴포넌트 → D2 목업 순으로 구축한다.

## 스택
Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Storybook · Prisma+PostgreSQL · lucide-react · Pretendard(로컬 번들)

## 실행
```bash
docker compose up -d   # 로컬 PostgreSQL 기동 (컨테이너 smartmes-postgres, 5432)
npm install
cp .env.example .env    # DATABASE_URL/SESSION_SECRET 설정 (없으면 앱이 즉시 실패)
npx prisma migrate deploy   # 최초 1회: 스키마 적용
npm run db:seed             # 최초 1회: 기본 데이터 시드
npm run dev         # http://localhost:3001
npm run storybook   # http://localhost:6006
npm test            # Vitest
npm run build       # 프로덕션 빌드
```
DB는 `docker-compose.yml`의 PostgreSQL 컨테이너를 사용한다(`DATABASE_URL="postgresql://smartmes:smartmes@localhost:5432/smartmes?schema=public"`). 스키마별로 격리되므로 dev(`public`)/e2e(`e2e`)/synth·loadtest 용 스키마를 자유롭게 나눠 쓸 수 있다.

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
npm test            # Vitest, 133개
```
`lib/`, `app/api/**` 등 도메인 로직·서비스 계층을 커버한다. `DATABASE_URL`(기본 `public` 스키마)로 접속하며, 대부분 순수 함수/서비스 단위 테스트다.

### E2E 테스트 (Playwright)
```bash
npm run test:e2e         # 헤드리스 전체 실행, 23개
npm run test:e2e:ui      # UI 모드로 디버깅
npm run test:e2e:headed  # 실제 브라우저 창을 띄워 실행
npm run test:e2e:report  # 마지막 실행의 HTML 리포트(영상 임베드) 열기
```
- 동일 PostgreSQL 인스턴스의 전용 스키마(`?schema=e2e`, `e2e/db-url.ts`의 `E2E_DATABASE_URL`)에서 동작 — `playwright.config.ts`의 `globalSetup`(`e2e/global-setup.ts`)이 실행 전 해당 URL로 `prisma migrate deploy` + `db:seed`를 수행해 dev(`public`) 스키마와 완전히 분리한다. 필요 시 `E2E_DATABASE_URL` 환경변수로 재정의 가능.
- 결정적 실행을 위해 `workers: 1`(직렬 실행)로 고정.
- 로컬에서는 `npm run dev`를, CI에서는 (빌드 산출물 기반) `npm run start`를 웹서버로 자동 기동한다.
- 커버리지: 로그인/리다이렉트(`auth`), 생산실적→재고(`production`), 입고·출하·반품(`logistics`), 청구·수금(`billing`), MRP 순소요(`mrp`), viewer 권한 차단(`rbac`).

#### 영상 녹화 & 진행 로그
- **영상**: 로컬 실행 시 테스트별로 `test-results/<테스트>/video.webm`에 전량 녹화(CI는 실패건만). 트레이스(`trace.zip`)·실패 스크린샷도 함께 저장 → `npm run test:e2e:report`의 HTML 리포트에서 재생·타임트래블 가능.
- **진행 로그**(커스텀 리포터 `e2e/progress-reporter.ts`): 실행 중/후 진행사항을 파일로 남긴다.
  - `test-results/e2e-progress.log` — 사람이 읽는 라인(타임스탬프·시작/통과/실패·소요시간·검증 단계·영상 경로).
  - `test-results/e2e-progress.jsonl` — 기계 판독용(테스트별 status·durationMs·error·video/trace 경로).
  - 이 외에 `test-results/results.json`(JSON), `test-results/junit.xml`(JUnit)도 생성.
- `test-results/`·`playwright-report/`는 `.gitignore` 대상(산출물이라 커밋하지 않음).

### 합성 데이터 생성기
```bash
npm run db:synth     # 기본 규모(품목 2,000 / 수불 5만 / 작업지시 2,000 / 수주 1,000)
```
- env 파라미터로 규모 조절: `SYNTH_ITEMS`, `SYNTH_TXNS`, `SYNTH_WORK_ORDERS`, `SYNTH_SALES_ORDERS`.
- 실행 시간이 걸리고 DB 용량이 커지므로 **별도 스키마에 실행 권장**:
  ```bash
  SYNTH_ITEMS=100 DATABASE_URL="postgresql://smartmes:smartmes@localhost:5432/smartmes?schema=synth" npx prisma migrate deploy
  SYNTH_ITEMS=100 DATABASE_URL="postgresql://smartmes:smartmes@localhost:5432/smartmes?schema=synth" npx tsx scripts/synth.ts
  ```
- 기존 seed 데이터 위에 `SYN-` 접두 코드로 대량 데이터를 append한다(seed 계정/기준정보는 보존).
- 부하 테스트(`scripts/loadtest.ts`)도 동일하게 별도 스키마(예: `?schema=load`) 사용을 권장한다.

### 테스트 계정
| 계정 | 비밀번호 | 역할 |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `operator` | `oper123` | OPERATOR |
| `viewer` | `view123` | VIEWER |

### CI 게이트
`.github/workflows/ci.yml` — `main`/`feature/**` push와 `main` 대상 PR에서 자동 실행:

CI는 `postgres:16-alpine` 서비스 컨테이너(포트 5432, healthcheck)를 띄우고 진행한다:

`npm ci` → `prisma generate` → `prisma migrate deploy`(`public` 스키마) → `db:seed` → `npm test` → `npm run build` → Playwright 브라우저 설치 → `npm run test:e2e`(전용 `e2e` 스키마, CI 모드). 실패 시 `playwright-report`를 아티팩트로 업로드한다. 단위·빌드·E2E 중 하나라도 실패하면 게이트가 막힌다(PR 머지 전 필수 확인).
