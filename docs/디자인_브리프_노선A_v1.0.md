# 디자인 브리프 — 노선 A 범용 제조 MES (v1.0)

> **용도**: 노선 A(그린필드 범용 제조 MES)를 새 세션에서 **디자인 우선(design-first)** 으로 착수할 때의 D0 출발점. 디자인 원칙 + 토큰 초안 + 컴포넌트 인벤토리 + 화면 레이아웃 가이드.
> **참조**: `요구사항명세서_노선A_범용웹MES_v1.0.md`(SRS), `MES_기능카탈로그_제품소개분석_v1.0.md`, `references/`(실제 MES 화면 캡처)
> **스택 전제**: Next.js14 + TS + Tailwind + shadcn/ui + Storybook, 다크/라이트 양대응, 한글 우선(Pretendard).

---

## 1. 디자인 원칙 (7)

1. **정보 밀도 우선** — MES는 조회·모니터링이 핵심. 여백 낭비 없이 한 화면에 많은 데이터를, 그러나 스캔 가능하게. 테이블 행 높이 32~36px, 조밀한 패딩.
2. **상태 즉시 인지** — 모든 상태(작업지시·품질·설비·재고)는 **일관된 의미색 + Pill**로. 색만 봐도 정상/주의/이상 판단. 색맹 대비 아이콘/텍스트 병기.
3. **실시간 안정성** — 라이브 수치는 `tabular-nums`로 지터 방지, 값 변경 시 레이아웃 시프트 금지. 연결 상태는 항상 톱바에 노출.
4. **역할별 뷰** — 경영(지표·요약) / 관리(계획·지시·기준정보 밀도 높은 작업 화면) / 현장(키오스크 대형 터치). 첫 화면과 밀도를 역할에 맞춤.
5. **현장 대비·터치** — 키오스크·현장 단말은 고대비, 최소 터치 타깃 44×44px, 큰 폰트(18px+), 장갑 낀 손 고려.
6. **접근성(WCAG AA)** — 본문 대비 4.5:1, 큰 텍스트 3:1, 키보드 내비, 명확한 포커스 링, prefers-color-scheme 존중.
7. **일관성** — 단일 컴포넌트 라이브러리로만 조립. 화면별 일회성 스타일 금지. 토큰 밖 하드코딩 색·간격 금지.

---

## 2. 디자인 토큰 (초안 — Tailwind config로 구현)

### 2.1 컬러 — 다크(기본)
| 역할 | 값 | 용도 |
|---|---|---|
| bg | `#0B0F14` | 최하위 배경 |
| surface | `#121821` | 카드·패널 |
| elevated | `#1A2230` | 모달·팝오버·호버 |
| border | `#26303D` | 경계선 |
| text | `#E2E8F0` | 본문 |
| text-muted | `#94A3B8` | 보조 |
| text-faint | `#64748B` | 라벨·비활성 |

### 2.2 컬러 — 라이트
| 역할 | 값 |
|---|---|
| bg | `#F6F8FA` · surface `#FFFFFF` · elevated `#FFFFFF` |
| border | `#E2E8F0` · text `#0F172A` · text-muted `#475569` |

### 2.3 브랜드·의미색 (라이트/다크 공통 hue, 명도만 조정)
| 토큰 | 값 | 의미 |
|---|---|---|
| primary | `#2563EB` (blue-600) | 주요 액션·강조·활성 |
| primary-fg | `#FFFFFF` | primary 위 텍스트 |
| ok / running | `#22C55E` | 정상·가동·완료 |
| warn / pending | `#F59E0B` | 주의·대기·안전재고 미달 |
| crit / stopped | `#EF4444` | 이상·정지·음수·불량 |
| info | `#38BDF8` | 정보·이동 |
| neutral / idle | `#64748B` | 계획·취소·비활성 |

**상태→색 매핑(고정)**: 작업지시 WAITING=warn · RUNNING=primary · DONE=ok · CANCELLED=neutral / 설비 RUN=ok · STOP=neutral · REPAIR=crit / 검사 PASS=ok · FAIL=crit · SPECIAL(특채)=warn / 재고 정상=neutral · 미달=warn · 음수=crit.

### 2.4 타이포그래피
- 폰트: **Pretendard**(한글) → fallback system-ui. 숫자 `font-variant-numeric: tabular-nums`.
- 스케일: 11(label) · 12(caption) · 13(body-sm) · 14(body) · 16(subtitle) · 20(h3) · 24(h2) · 30(h1)
- 웨이트: 400 본문 / 500 강조 / 600 제목·버튼 / 700 페이지 타이틀
- 키오스크 전용: body 18, 값 28~32, 버튼 20

### 2.5 간격·형태
- 간격 스케일: 4·8·12·16·24·32·48 (4px 기반)
- 라운드: sm 4 / md 6 / lg 8 / full(pill)
- 테두리: 1px `border`
- 그림자: 다크는 그림자 대신 elevated 배경+border로 층 표현. 라이트는 `0 1px 2px rgba(0,0,0,.06)`, 모달 `0 8px 24px rgba(0,0,0,.12)`
- 포커스 링: `ring-2 ring-primary/50`
- 밀도: 데스크톱 테이블 행 34px·셀 py-1.5 / 키오스크 컨트롤 min-h 48px

### 2.6 모션
- 트랜지션 120~180ms ease. 상태 변경 색 페이드. 과한 애니메이션 금지(현장 피로).

---

## 3. 컴포넌트 인벤토리 (D1 — Storybook로 격리 구현·검증)

**기본**: Button(primary/secondary/ghost/danger, sm/md/lg) · IconButton · Input · Select · Textarea · Checkbox/Radio · Switch · DatePicker(달력) · NumberStepper(키오스크 ±)

**데이터**: **DataTable**(정렬·필터·페이지·조밀 밀도·고정헤더·행선택) · KPITile(수치+델타+스파크라인) · StatPill(의미색 상태) · ProgressBar · Badge · EmptyState · Skeleton/Loading

**레이아웃/네비**: AppShell(사이드바 GNB + 톱바) · Breadcrumb · Tabs · Card/Panel · SectionHeader · Modal/Drawer · Toast · ConnectionBadge · Clock

**MES 특화**: **StatusPill**(WAITING/RUNNING/…) · **WorkOrderCard**(칸반 카드) · **GenealogyTree**(Lot 계보 트리/그래프) · **Stepper**(공정 진행) · **GaugeTile**(환경·OEE) · **HeatmapCell**(설비 부하·공간) · GanttBar(APS, 후속) · **KioskNumpad/KioskStepper**(현장 대형 입력)

**차트**: Line/Bar/Pie(recharts) · Sparkline · ParetoChart(불량) · ControlChart(SPC X-bar/R, 후속)

---

## 4. 핵심 화면 레이아웃 가이드 (D2 목업 대상 우선순위)

1. **역할별 대시보드** — 상단 KPI 타일 4~6(계획대비 실적·가동률/OEE·불량 PPM·재고 경고·활성 알람) → 아래 2컬럼(생산 현황 테이블 / 알람·이벤트·라인 상태). 경영=요약 위주, 관리=바로 드릴다운 링크.
2. **작업지시** — 3뷰 토글: **리스트**(DataTable) · **칸반**(WAITING/RUNNING/DONE 컬럼, WorkOrderCard 드래그) · **간트**(계획일 기준, 후속). 우측 드로어로 상세.
3. **생산실적 입력** — PC: 좌 작업지시 선택 + 우 실적 폼(양품/불량/비가동/불량코드). 키오스크: 풀스크린, 대형 StatusPill·NumStepper·큰 등록 버튼.
4. **Lot 추적** — 중앙 GenealogyTree(↑조상 ↓후손 방사형/트리), 노드 클릭 시 사이드에 LOT 상세(공정·검사·수불). 상단 검색.
5. **재고 현황** — DataTable(품목·현재고·안전재고·상태Pill) + 상단 경고 배너(음수·미달). 품목 클릭 → 수불 이력 드로어.
6. **품질 검사** — 검사 목록 + 판정 폼 + 불량 파레토 차트 + 샘플 사진 첨부.

레이아웃 골격: 좌측 고정 사이드바(w-56) + 스티키 톱바 + `max-w` 콘텐츠. 브레드크럼 필수(2뎁스+). 키오스크·로그인은 크롬 없는 풀스크린.

---

## 5. 레퍼런스 활용
`references/`(Frame7 캡처 52장)은 **정보구조·기능 레퍼런스**로만. 비주얼(구형 WinForm 그리드)은 따라하지 말 것 — 위 토큰 기반의 **현대적 다크 대시보드**로 재해석. 밀도·컬럼 구성·업무 흐름만 참고.

## 6. D단계 산출물 정의(완료 기준)
- **D0**: 이 브리프 확정 + `tailwind.config` 토큰 + `globals.css` + 다크/라이트 토글 동작.
- **D1**: 위 컴포넌트 Storybook 스토리 + 상태·밀도·다크/라이트 변형 확인. `/ux-review`·`/a11y` 통과.
- **D2**: 핵심 화면 5개 하이파이 목업(정적 데이터) 승인.
- 이후: SRS R1(MVP)부터 위 컴포넌트로 조립.
