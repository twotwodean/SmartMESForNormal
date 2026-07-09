# 소프트웨어 요구사항 명세서 (SRS) — 노선 A: 범용 웹 MES 신규 구축 v1.0

> **표준**: IEEE 830 / ISO·IEC·IEEE 29148 기반
> **노선 정의**: 기존 SmartMES(팽이버섯)에 종속되지 않는 **독립적 범용 제조 MES를 신규 구축**한다. 상용 MES 제품(Frame7) 기능을 웹기반으로 재현하되, 도메인 중립적으로 설계한다.
> **용도**: **다른 세션/창에서 이 문서만으로 착수 가능**하도록 자기완결적으로 작성. (현 SmartMES 코드 참조 불필요)
> **근거**: `docs/MES_기능카탈로그_제품소개분석_v1.0.md`
> **작성일**: 2026-07-09

---

## 1. 개요 (Introduction)

### 1.1 목적
범용 이산제조 환경에서 사용 가능한 웹기반 MES를 신규 구축하기 위한 소프트웨어 요구사항을 정의한다. 대상 독자: 개발팀(구현), 검증팀, 제품 오너.

### 1.2 제품 범위
- 기준정보(품목·BOM·작업장·설비·공정·Routing) 관리
- 생산 실행(계획→작업지시→실적→Lot추적)
- 품질(수입·공정·출하 검사, 부적합, PPM, 클레임)
- 설비보전(점검·수리·MTTR/MTBF)
- 자재(입출고·수불·재고·구매·외주)
- 영업(수주·출하) — 축소 범위
- 실시간 모니터링 대시보드(POP)
- **제외**: 무역, APS 자동스케줄러, 금형/치형구, 회계전표/원가, 전자결재, APQP, FMEA/ISIR(부록 참조, 후속 릴리스)

### 1.3 정의·약어
| 약어 | 의미 |
|---|---|
| MES | Manufacturing Execution System(제조실행시스템) |
| POP | Point Of Production(생산시점관리) |
| QMS | Quality Management System(품질경영시스템) |
| BOM | Bill Of Materials(자재명세서) |
| Routing | 품목별 공정 순서·표준시간 |
| Lot | 생산/추적 단위 배치 |
| WO | Work Order(작업지시) |
| OEE | Overall Equipment Effectiveness(설비종합효율) |
| PPM | Parts Per Million(불량률) |
| MTTR/MTBF | 평균수리시간/평균고장간격 |
| RBAC | Role-Based Access Control |

### 1.4 참조
- MES 기능 카탈로그: `docs/MES_기능카탈로그_제품소개분석_v1.0.md`
- 노선 B 기능정의서(비교용): `docs/기능정의서_노선B_SmartMES확장_v1.0.md`

### 1.5 문서 구성
2장 전체 설명 · 3장 기능 요구사항(FR) · 4장 외부 인터페이스 · 5장 비기능 요구사항(NFR) · 6장 데이터 요구사항 · 7장 우선순위·릴리스 · 8장 부록.

---

## 2. 전체 설명 (Overall Description)

### 2.1 제품 관점
독립형 웹 애플리케이션. 3계층 사용자(경영/관리/현장)를 단일 웹앱으로 지원하며, 현장 데이터 수집(수동입력·바코드·선택적 PLC/센서 연동)을 전제로 한다. ERP는 외부 연동 대상(선택).

### 2.2 제품 기능 요약
기준정보 → 생산계획 → 작업지시 → 생산실적 → Lot 추적 → 품질검사 → 재고수불 → 설비보전 → 실시간 대시보드의 폐루프.

### 2.3 사용자 계층 및 특성
| 계층 | 역할 | 주요 기능 |
|---|---|---|
| 경영(Director/ADMIN) | 지표·분석 조회, 마스터 관리 | 대시보드·현황·기준정보 CRUD |
| 관리(Manager/OPERATOR) | 계획·지시·실적·검사 | 생산/품질/설비 등록·처리 |
| 현장(Worker/KIOSK·VIEWER) | 실적 입력, 조회 | 키오스크 실적·바코드·조회 |

### 2.4 운영 환경 (권장 기술 스택)
- Frontend: Next.js 14(App Router) · TypeScript 5.2 · Tailwind CSS 3.4
- Backend: Route Handlers 또는 Fastify(API 분리 선택)
- ORM/DB: **Prisma + SQLite(기본)**. 대규모/동시성 요구 시 PostgreSQL 전환 옵션(스키마 호환 유지).
- 인증: 세션 기반 RBAC(ADMIN⊇OPERATOR⊇VIEWER)
- 실시간: WebSocket 또는 폴링
- 배포: 단일 노드(Docker) 기본, 멀티사이트는 후속.

### 2.5 제약 (Constraints)
- 보안정보는 환경변수만(.env.example 제공, .env.local 미커밋).
- 필수 환경변수 누락 시 앱 즉시 실패.
- 코드 스타일: Components PascalCase / files kebab-case / functions camelCase / 상수 UPPER_SNAKE / `any` 금지.
- 한글 UI/데이터 UTF-8 보존.

### 2.6 가정 및 의존성
- 실 PLC가 없을 수 있으므로 데이터 수집은 수동입력+바코드를 기본 경로로 하고 PLC/센서 연동은 선택 모듈로 분리.
- 초기 단일 사업장·단일 창고 가정.

---

## 3. 기능 요구사항 (Functional Requirements)

> 표기: `FR-<모듈>-<n>` / 우선순위 M(Must)·S(Should)·C(Could).

### 3.1 기준정보 (FR-MST)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-MST-1 | 품목(완제품/반제품/원자재/부자재) 등록·수정·조회·분류검색·변경이력 | M |
| FR-MST-2 | BOM(다단 정전개/역전개) 등록·조회, 순환참조 차단 | M |
| FR-MST-3 | 작업장·설비 등록, 작업장-공정 매핑 | M |
| FR-MST-4 | 생산공정 등록 및 품목별 Routing(공정 순서·표준시간·작업장) | M |
| FR-MST-5 | 모델/사양(옵션) 관리 | C |
| FR-MST-6 | 문서/도면 첨부(리비전) 관리 | C |

### 3.2 생산 실행 (FR-PRD)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-PRD-1 | 월/주/일 생산계획 등록·현황, 부하분석 | M |
| FR-PRD-2 | 생산계획→작업지시 전개, 작업지시 발행·분할·취소·현황 | M |
| FR-PRD-3 | 생산실적 등록(양품/불량/비가동/투입), PC + 키오스크 터치 UI | M |
| FR-PRD-4 | Lot 생성·부여, Lot 계보(부모→자식 승계·병합) 기록 | M |
| FR-PRD-5 | Lot 정방향/역방향 추적(원자재↔완제품), 바코드/QR 발행·스캔 | M |
| FR-PRD-6 | 생산실적 현황·집계·수율·재공(WIP) 현황 | M |
| FR-PRD-7 | OEE(설비종합효율), 인당 생산성, 비가동 분석 | S |
| FR-PRD-8 | 외주가공 발주·입고 | C |

### 3.3 품질 (FR-QLT)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-QLT-1 | 인수/공정/출하 검사 등록·현황, 검사기준·검사항목·AQL 마스터 | M |
| FR-QLT-2 | 불량코드 마스터, 부적합 등록·개선대책 | M |
| FR-QLT-3 | PPM 현황(공정/완성/인수) | S |
| FR-QLT-4 | 특채(수락) 의뢰·승인·진행 | S |
| FR-QLT-5 | 클레임/고객불만 접수·처리·현황 | C |
| FR-QLT-6 | 계측기 교정 관리 / FMEA / ISIR / 신뢰성시험 | C(후속) |

### 3.4 설비 (FR-EQP)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-EQP-1 | 설비 등록·현황·가동시간 | M |
| FR-EQP-2 | 수리의뢰·수리결과·수리내역, MTTR/MTBF | S |
| FR-EQP-3 | 예방점검 스케줄 자동생성·점검실적 | S |
| FR-EQP-4 | 예비품(MRO) 재고 관리 | C |
| FR-EQP-5 | 금형/치형구 관리 | C(후속) |

### 3.5 자재 (FR-MAT)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-MAT-1 | 자재 입고/출고/이동/조정, Lot별 수불·재고현황 | M |
| FR-MAT-2 | 구매의뢰·발주·입고, 발주대비 입고현황 | S |
| FR-MAT-3 | 소요량 계산(MRP: 계획·현재고·안전재고 반영) | C |
| FR-MAT-4 | 매입 처리·매입원장 | C |
| FR-MAT-5 | SCM 협력사 발주조회·거래명세·납품현황 | C |

### 3.6 영업 (FR-SAL)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-SAL-1 | 수주 등록·현황, 수주→생산의뢰 | S |
| FR-SAL-2 | 출하요청·출하등록·출하현황·반품 | S |
| FR-SAL-3 | 매출·수금·단가·운송 | C(후속) |

### 3.7 인증·권한 (FR-SEC)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-SEC-1 | 로그인/로그아웃, 세션 관리 | M |
| FR-SEC-2 | RBAC(ADMIN⊇OPERATOR⊇VIEWER), 라우트/기능 단위 가드(401/403) | M |
| FR-SEC-3 | 감사 로그(주요 등록/변경 이력) | S |

### 3.8 대시보드·모니터링 (FR-DSH)
| ID | 요구사항 | 우선 |
|---|---|---|
| FR-DSH-1 | 실시간 생산현황(계획대비 실적·공정진척·작업지시 상태) | M |
| FR-DSH-2 | 품질(부적합/PPM)·설비(가동/고장)·재고 점유 카드 | S |
| FR-DSH-3 | 알람·이벤트 알림, 심플/상세 뷰 토글 | S |
| FR-DSH-4 | 현황/실적 데이터 엑셀/CSV 내보내기 | S |

---

## 4. 외부 인터페이스 요구사항

### 4.1 사용자 인터페이스
- 반응형 웹(데스크톱 관리 화면 + 현장 키오스크 터치 화면). 표/그리드·Pivot·차트·간트(후속) 지원. 한글 기본.

### 4.2 하드웨어 인터페이스
- 바코드/QR 스캐너(키보드 웨지 또는 시리얼). 라벨 프린터 출력.
- (선택) PLC/센서: Modbus TCP 등 필드버스 어댑터를 별도 모듈로 분리(코어와 느슨 결합).

### 4.3 소프트웨어 인터페이스
- REST/JSON API. (선택) ERP 연동 인터페이스(기준정보·수주·입고·실적 동기화).

### 4.4 통신 인터페이스
- HTTPS(운영). 실시간은 WebSocket/폴링.

---

## 5. 비기능 요구사항 (NFR)

| ID | 항목 | 요구사항 |
|---|---|---|
| NFR-PERF-1 | 성능 | 목록 조회 P95 < 500ms, 대시보드 갱신 ≤ 5s |
| NFR-PERF-2 | 확장성 | SQLite→PostgreSQL 전환 가능(ORM 추상화 유지) |
| NFR-REL-1 | 신뢰성 | 트랜잭션 정합성(재고=수불 합계), 장애 시 데이터 무손상 |
| NFR-REL-2 | 백업 | DB 백업/복구 절차 제공 |
| NFR-SEC-1 | 보안 | RBAC, 비밀정보 환경변수, 입력 검증, 감사 로그 |
| NFR-USE-1 | 사용성 | 현장 키오스크 3탭 이내 실적 입력, 한글 라벨 |
| NFR-MNT-1 | 유지보수 | 순수 도메인 함수 단위테스트, 계층 분리(route/service/domain) |
| NFR-PORT-1 | 이식성 | Docker 단일 컨테이너 실행, .env.example 제공 |
| NFR-I18N-1 | 국제화 | UTF-8, 한글 우선(다국어는 후속) |

---

## 6. 데이터 요구사항

### 6.1 핵심 엔티티 (개념 모델)
Item, Bom(Component), WorkCenter, Equipment, ProcessStage, Routing/RoutingStep, ProductionPlan, WorkOrder, Lot, LotGenealogy, ProductionResult, DefectCode, Inspection, InspectionStandard, Nonconformance, MaintenanceOrder, MaintenanceSchedule, InventoryTxn, Stock, PurchaseOrder, GoodsReceipt, SalesOrder, Shipment, User, AuditLog, Alarm.

### 6.2 핵심 관계
- Item 1–N Routing 1–N RoutingStep(–ProcessStage/WorkCenter)
- ProductionPlan 1–N WorkOrder 1–N Lot; WorkOrder 1–N ProductionResult
- Lot N–N Lot(via LotGenealogy: parent/child)
- Item 1–N InventoryTxn; Lot 1–N InventoryTxn
- Lot/WorkOrder 1–N Inspection; Inspection–DefectCode
- Equipment 1–N MaintenanceOrder/Schedule

### 6.3 데이터 규칙
- 코드 필드(품목·작업장·설비·WO·Lot) 유일성.
- Lot 상태 머신 정의(생성→진행→검사→합격/불합격→출하).
- 재고 트랜잭션 append-only, 현재고=파생 집계.
- seed는 즉시 실행 가능한 최소 데이터(품목/작업장/Routing/샘플 WO).

---

## 7. 우선순위 및 릴리스 계획

| 릴리스 | 포함 (FR) | 목표 |
|---|---|---|
| **R1 (MVP)** | MST-1~4, PRD-1~6, SEC-1~2, DSH-1 | 생산 폐루프 + Lot 추적 동작 |
| **R2** | QLT-1~3, EQP-1~3, MAT-1, PRD-7, DSH-2~4, SEC-3 | 품질·설비·재고·OEE |
| **R3** | MAT-2, SAL-1~2, QLT-4, MST-5~6 | 자재구매·영업·특채 |
| **R4(후속)** | MRP, SCM, 매출/수금, 금형, FMEA/ISIR, APS, 무역 | ERP 확장 |

---

## 8. 부록

### 부록 A — 제외 범위(초기)와 사유
무역관리(순수 ERP), APS 자동스케줄러(알고리즘 난이도·별도 엔진), 금형/치형구(특정 업종), 회계전표/원가·전자결재(ERP), APQP·FMEA·ISIR·신뢰성시험(고객사 인증 특화) → R4 이후 또는 별도 프로젝트.

### 부록 B — 카탈로그 전체 메뉴 트리
`docs/MES_기능카탈로그_제품소개분석_v1.0.md` §2~§10 참조(8대 모듈, 개별 메뉴 500+ 전수).

### 부록 C — 노선 A vs 노선 B 비교
| 구분 | 노선 A(본 문서) | 노선 B(기능정의서) |
|---|---|---|
| 출발점 | 신규 구축(그린필드) | 기존 SmartMES 확장 |
| 도메인 | 범용 제조 중립 | 팽이버섯 유지+제조 일반화 |
| 재활용 | 없음(새 코드) | 인증·알람·환경·Lot·대시보드 |
| 장점 | 깨끗한 범용 모델 | 빠른 착수·검증된 기반 |
| 단점 | 초기 비용↑ | 도메인 혼재 관리 필요 |
| 권장 상황 | 다른 고객사/범용 제품화 | 현 SmartMES 상용화 지속 |
