# SmartMES (범용 제조 MES) — 킥오프

> 이 폴더는 **노선 A: 도메인 중립 범용 제조 MES**를 새로 구축하기 위한 시작점입니다.
> 팽이버섯 SmartMES와 무관한 **그린필드** 프로젝트입니다.

## 준비된 자료

| 파일 | 내용 |
|---|---|
| `docs/요구사항명세서_노선A_범용웹MES_v1.0.md` | **SRS**(IEEE830) — 기능(FR)·비기능(NFR)·데이터·릴리스 R1~R4 |
| `docs/MES_기능카탈로그_제품소개분석_v1.0.md` | 상용 MES(Frame7) 전체 메뉴/기능 500+ 참조 |
| `docs/디자인_브리프_노선A_v1.0.md` | **디자인 원칙 + 토큰 + 컴포넌트 인벤토리 + 화면 레이아웃** (D0 출발점) |
| `docs/디자인_목업_v1.0.html` | 통합 대시보드 하이파이 목업(브라우저로 열기) — 확정할 룩앤필 |
| `references/` (52장) | 실제 MES 화면 캡처 — **정보구조·기능 레퍼런스**(비주얼은 따라하지 말 것) |

## 진행 원칙 — 디자인 우선(design-first)

기능 코딩 전에 디자인 시스템부터 완성한다.

- **D0** 디자인 토큰: `docs/디자인_브리프` 확정 → tailwind.config 토큰 + globals + 다크/라이트 토글
- **D1** 컴포넌트 라이브러리(Storybook): DataTable·StatusPill·KPITile·AppShell·GenealogyTree·KioskStepper 등 → `/ux-review`·`/a11y` 통과
- **D2** 핵심 화면 5개 하이파이 목업 승인(역할별 대시보드·작업지시·실적입력·Lot추적·재고)
- 이후 SRS R1(MVP)부터 위 컴포넌트로 조립

## 스택

Next.js14(App Router) · TS · Tailwind · **shadcn/ui** · **Storybook** · Prisma+SQLite(→PostgreSQL 전환 가능) · 다크/라이트 · 한글(Pretendard)

## 새 세션에 붙여넣을 프롬프트

```
Github/SmartMES_normal 에서 범용 제조 MES(이산제조)를 웹으로 새로 구축한다. 도메인 중립 그린필드.
스펙: docs/요구사항명세서_노선A_범용웹MES_v1.0.md
참조: docs/MES_기능카탈로그_제품소개분석_v1.0.md, docs/디자인_브리프_노선A_v1.0.md,
      docs/디자인_목업_v1.0.html(확정 룩앤필), references/(실제 MES 캡처)

디자인 우선으로 진행한다. 기능 코딩 전에 디자인 시스템부터 완성한다.
스택: Next.js14 + TS + Tailwind + shadcn/ui + Storybook, Prisma+SQLite, 다크/라이트, Pretendard.

먼저 brainstorming으로 디자인 브리프를 검토·확정한 뒤,
D0 토큰(tailwind.config+globals) → D1 컴포넌트(Storybook) → D2 핵심화면5 목업 순서로
각 단계 승인받으며 진행. /design-system, /design, /ux-review, /a11y 스킬 활용.
git init 후 feature/design-system 브랜치에서 시작.
```

## 참고
- 원본 문서는 팽이 repo(`SmartMES-v2-recipe/docs/`)에도 있으며, 이 폴더는 그 사본으로 독립 진행용.
- 목업의 룩앤필(다크 산업용 대시보드·의미색 상태 Pill·조밀 테이블)이 방향입니다. 바꾸고 싶으면 D0에서 토큰만 조정.
