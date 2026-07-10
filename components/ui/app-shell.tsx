import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── AppShell: 사이드바 + 톱바 + 콘텐츠 Grid ── */
export function AppShell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-border bg-surface md:flex">
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg/90 px-5 py-2.5 backdrop-blur">
          {topbar}
        </header>
        <main className="w-full max-w-[1380px] px-6 pb-12 pt-5">{children}</main>
      </div>
    </div>
  );
}

/* ── SidebarNav ── */
export interface SideNavItem {
  label: string;
  icon?: LucideIcon;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}
export interface SideNavGroup {
  label: string;
  items: SideNavItem[];
}

export function SidebarNav({
  brand,
  groups,
  footer,
}: {
  brand: React.ReactNode;
  groups: SideNavGroup[];
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-4 py-4 text-subtitle font-bold text-text">
        {brand}
      </div>
      <nav className="flex flex-1 flex-col gap-4 p-2.5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-2 pb-1.5 text-label font-semibold uppercase tracking-wide text-text-faint">{g.label}</p>
            {g.items.map((it) => {
              const Icon = it.icon;
              const cls = cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-body-sm transition",
                it.active ? "bg-primary-soft font-semibold text-primary" : "text-text-muted hover:bg-elevated hover:text-text",
              );
              const content = (
                <>
                  {Icon && <Icon size={16} aria-hidden />}
                  {it.label}
                </>
              );
              return it.href ? (
                <a key={it.label} href={it.href} className={cls} aria-current={it.active ? "page" : undefined}>
                  {content}
                </a>
              ) : (
                <button key={it.label} type="button" onClick={it.onClick} className={cn(cls, "w-full text-left")} aria-current={it.active ? "page" : undefined}>
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-border p-2.5">{footer}</div>}
    </>
  );
}

/* ── Topbar: 좌측(브레드크럼 등) + 우측 슬롯 ── */
export function Topbar({ children, right }: { children?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <>
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </>
  );
}
