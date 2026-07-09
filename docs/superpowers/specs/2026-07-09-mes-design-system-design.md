# 설계 스펙 — 노선 A 범용 웹 MES 디자인 시스템 (v1.0)

> **작성일**: 2026-07-09
> **상태**: 확정 (브레인스토밍 승인 완료)
> **범위**: 디자인 우선(design-first) 진행의 D0(토큰) → D1(컴포넌트) → D2(핵심화면 목업) 설계
> **참조**: `docs/요구사항명세서_노선A_범용웹MES_v1.0.md`(SRS), `docs/디자인_브리프_노선A_v1.0.md`, `docs/디자인_목업_v1.0.html`(확정 룩앤필), `references/`(실제 MES 캡처 52장)

---

## 1. 목표와 배경

기존 디자인 브리프와 하이파이 목업 HTML을 **출발점으로 확정**하고, 기술 결정을 잠근 뒤 디자인 시스템을 D0 → D1 → D2 순서로 구축한다. 기능 코딩(SRS R1 MVP)은 디자인 시스템 완성 이후 착수한다.

**룩앤필 방향(확정)**: 다크 산업용 대시보드 · 의미색 상태 Pill · 조밀한 데이터 테이블. 목업 HTML의 방향을 유지하고 세부만 보완한다.

---

## 2. 스택 & 아키텍처 (확정)

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) + TypeScript 5.2 |
| 스타일 | Tailwind CSS 3.4 |
| 컴포넌트 | shadcn/ui (Radix 기반, 복사 후 우리 토큰으로 리테마) + Storybook |
| DB/ORM | Prisma + SQLite (→ PostgreSQL 전환 가능하도록 ORM 추상화 유지) |
| 테마 | 다크/라이트 양대응, **다크 기본** + localStorage 저장(+ system 존중) |
| 폰트 | Pretendard woff2 **로컬 번들** (next/font local), fallback system-ui |
| 아이콘 | lucide-react (목업의 이모지는 실제 구현 시 lucide로 대체) |
| 계층 | route → service → domain (도메인 순수함수 단위테스트 가능) |

---

## 3. 이번 세션에서 잠근 결정

| 항목 | 결정 | 사유 |
|---|---|---|
| 룩앤필 | 목업 방향 확정, 세부만 보완 | 이미 검증된 다크 산업용 대시보드 |
| 컴포넌트 방식 | shadcn/ui 리테마 | 접근성·키보드 내비게이션·포커스 관리 기본 제공, MES 특화만 직접 제작 |
| 폰트 | Pretendard 로컬 번들 | 오프라인·온프레미스(공장 망) 환경 안정성 |
| 테마 | 다크 기본 + 수동 토글(localStorage) | 현장 모니터링 환경에 적합 |
| 아이콘 | lucide-react | shadcn 표준, 일관성 |
| 대시보드 범위 | 경영/관리/현장 3개 분리 | RBAC·정보 밀도 차이가 커 역할별 별도 화면 필요 |
| D1 순서 | 기반 → 데이터 → 레이아웃 → MES특화 | 의존성 순서대로 쌓아 재작업 최소화 |

---

## 4. 디자인 원칙 (7)

1. **정보 밀도 우선** — 여백 낭비 없이 스캔 가능한 조밀 레이아웃. 테이블 행 34px 내외.
2. **상태 즉시 인지** — 모든 상태는 일관된 의미색 + Pill. 색맹 대비 아이콘/텍스트 병기.
3. **실시간 안정성** — 라이브 수치는 `tabular-nums`, 값 변경 시 레이아웃 시프트 금지, 연결 상태 상시 톱바 노출.
4. **역할별 뷰** — 경영(지표·요약) / 관리(계획·지시 밀도) / 현장(키오스크 대형 터치).
5. **현장 대비·터치** — 키오스크 최소 터치 타깃 44×44px, 큰 폰트(18px+), 고대비.
6. **접근성(WCAG AA)** — 본문 대비 4.5:1, 큰 텍스트 3:1, 키보드 내비, 명확한 포커스 링, prefers-color-scheme 존중.
7. **일관성** — 단일 컴포넌트 라이브러리로만 조립. 토큰 밖 하드코딩 색·간격 금지.

---

## 5. 디자인 토큰 (D0 산출물)

목업 HTML의 CSS 변수 값을 채택하여 `tailwind.config.ts`의 `theme.extend`와 `globals.css`의 CSS 변수로 이식한다.

### 5.1 컬러 — 다크(기본)
| 역할 | 값 |
|---|---|
| bg | `#0B0F14` |
| surface | `#121821` |
| elevated | `#1A2230` |
| border | `#26303D` |
| text | `#E2E8F0` |
| text-muted | `#94A3B8` |
| text-faint | `#64748B` |

### 5.2 컬러 — 라이트
| 역할 | 값 |
|---|---|
| bg | `#F6F8FA` |
| surface | `#FFFFFF` |
| elevated | `#FFFFFF` |
| border | `#E3E8EF` |
| text | `#0F172A` |
| text-muted | `#52607A` |
| text-faint | `#8A97AD` |

### 5.3 의미색 (다크 / 라이트 명도 조정, soft 변형 포함)
| 토큰 | 다크 | 라이트 | 의미 |
|---|---|---|---|
| primary | `#3B82F6` | `#2563EB` | 주요 액션·강조·활성 |
| ok / running | `#22C55E` | `#16A34A` | 정상·가동·완료 |
| warn / pending | `#F59E0B` | `#D97706` | 주의·대기·안전재고 미달 |
| crit / stopped | `#EF4444` | `#DC2626` | 이상·정지·음수·불량 |
| info | `#38BDF8` | `#0EA5E9` | 정보·이동 |
| neutral / idle | `#64748B` | `#64748B` | 계획·취소·비활성 |

각 의미색은 `-soft` 배경 변형을 가진다(Pill·배너용). primary-fg는 `#FFFFFF`.

### 5.4 상태 → 색 매핑 (고정)
- **작업지시**: WAITING=warn · RUNNING=primary/info · DONE=ok · CANCELLED=neutral
- **설비**: RUN=ok · STOP=neutral · REPAIR=crit
- **검사**: PASS=ok · FAIL=crit · SPECIAL(특채)=warn
- **재고**: 정상=neutral · 미달=warn · 음수=crit

### 5.5 타이포그래피
- 폰트: Pretendard → system-ui fallback. 숫자 `font-variant-numeric: tabular-nums`.
- 스케일: 11(label) · 12(caption) · 13(body-sm) · 14(body) · 16(subtitle) · 20(h3) · 24(h2) · 30(h1)
- 웨이트: 400 본문 / 500 강조 / 600 제목·버튼 / 700 페이지 타이틀
- 키오스크 전용: body 18, 값 28~32, 버튼 20

### 5.6 간격·형태·모션
- 간격: 4·8·12·16·24·32·48 (4px 기반)
- 라운드: sm 4 / md 6 / lg 8 / full(pill)
- 테두리: 1px `border`
- 그림자: 다크는 elevated 배경+border로 층 표현. 라이트는 `0 1px 2px rgba(15,23,42,.06)`, 모달 `0 8px 28px rgba(15,23,42,.14)`
- 포커스 링: `ring-2 ring-primary/50`
- 밀도: 데스크톱 테이블 행 34px·셀 py-1.5 / 키오스크 컨트롤 min-h 48px
- 모션: 트랜지션 120~180ms ease. 상태 변경 색 페이드. 과한 애니메이션 금지.

### 5.7 D0 완료 기준
- `tailwind.config.ts` 토큰 확장 + `globals.css` CSS 변수 (다크/라이트/system)
- 테마 토글 동작(다크 기본, localStorage 저장)
- Pretendard 로컬 번들 로드 확인
- Storybook 부팅 + 토큰 참조 가능

---

## 6. 컴포넌트 인벤토리 & D1 빌드 순서

빌드는 의존성 순서(기반 → 데이터 → 레이아웃 → MES특화)로 진행하며, 각 스토리는 **상태·밀도·다크/라이트 변형**을 포함한다.

### 6.1 기반
Button(primary/secondary/ghost/danger × sm/md/lg) · IconButton · Input · Select · Textarea · Checkbox/Radio · Switch · DatePicker · NumberStepper · Badge · **StatusPill**

### 6.2 데이터
**DataTable**(정렬·필터·페이지·조밀밀도·고정헤더·행선택) · KPITile(수치+델타+스파크라인) · ProgressBar · EmptyState · Skeleton/Loading

### 6.3 레이아웃/네비
AppShell(사이드바 GNB + 톱바) · Breadcrumb · Tabs · Card/Panel · SectionHeader · Modal/Drawer · Toast · ConnectionBadge · Clock

### 6.4 MES 특화
WorkOrderCard(칸반 카드) · **GenealogyTree**(Lot 계보 트리/그래프) · Stepper(공정 진행) · GaugeTile(OEE·환경) · KioskNumpad/KioskStepper(현장 대형 입력)

### 6.5 후속 (D1 이후)
GanttBar(APS) · ParetoChart(불량) · ControlChart(SPC X-bar/R) · HeatmapCell(설비 부하)

### 6.6 D1 완료 기준
- 위 컴포넌트 Storybook 스토리 완비 (상태·밀도·다크/라이트 변형)
- `/ux-review` 통과
- `/a11y` (WCAG AA) 통과

---

## 7. D2 핵심 화면 목업 — 7개 (정적 데이터)

대시보드 3개 분리 결정에 따라 5개 핵심화면이 7개 목업이 된다.

| # | 화면 | 핵심 레이아웃 |
|---|---|---|
| 1 | 경영 대시보드 | 상단 KPI 타일 4~6 → 요약 위주, 지표 중심 |
| 2 | 관리 대시보드 | KPI + 생산현황 테이블 / 알람·라인상태 2컬럼, 드릴다운 링크 밀도 높게 |
| 3 | 현장 키오스크 대시보드 | 풀스크린 대형 터치, 큰 StatusPill·수치 |
| 4 | 작업지시 | 3뷰 토글(리스트 DataTable / 칸반 WorkOrderCard / 간트) + 우측 상세 드로어 |
| 5 | 생산실적 입력 | PC: 좌 지시 선택 + 우 실적 폼(양품/불량/비가동/불량코드) · 키오스크: 풀스크린 NumStepper·큰 등록 버튼 |
| 6 | Lot 추적 | 중앙 GenealogyTree(↑조상 ↓후손), 노드 클릭 시 사이드 LOT 상세, 상단 검색 |
| 7 | 재고 현황 | DataTable(품목·현재고·안전재고·상태Pill) + 상단 경고 배너(음수·미달), 품목 클릭 → 수불 이력 드로어 |

레이아웃 골격: 좌측 고정 사이드바(w-56) + 스티키 톱바 + `max-w` 콘텐츠 + 브레드크럼(2뎁스+). 키오스크·로그인은 크롬 없는 풀스크린.

### 7.1 D2 완료 기준
7개 화면 하이파이 목업(정적 데이터)이 D1 컴포넌트로만 조립되어 승인.

---

## 8. 진행 순서 요약

1. **D0** — 토큰: `tailwind.config.ts` + `globals.css` + 테마 토글 + Pretendard 번들 + Storybook 부팅
2. **D1** — 컴포넌트: 기반 → 데이터 → 레이아웃 → MES특화, `/ux-review`·`/a11y` 통과
3. **D2** — 7개 핵심 화면 하이파이 목업 승인
4. **이후** — SRS **R1(MVP)**(MST-1~4, PRD-1~6, SEC-1~2, DSH-1)부터 이 컴포넌트로 조립

각 D단계는 승인 게이트를 거친다.

---

## 9. 레퍼런스 활용 원칙

`references/`(Frame7 캡처 52장)은 **정보구조·기능·업무흐름 레퍼런스로만** 사용한다. 구형 WinForm 그리드 비주얼은 따라하지 않고, 위 토큰 기반의 현대적 다크 대시보드로 재해석한다.
