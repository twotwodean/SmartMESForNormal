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
