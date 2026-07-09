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
