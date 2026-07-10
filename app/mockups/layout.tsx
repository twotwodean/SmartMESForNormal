"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Factory, ClipboardList, GitBranch, Boxes, ClipboardCheck, Wrench, ScrollText } from "lucide-react";
import { AppShell, SidebarNav, Topbar, type SideNavGroup } from "@/components/ui/app-shell";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { ConnectionBadge } from "@/components/ui/connection-badge";
import { Clock } from "@/components/ui/clock";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";

const NAV: SideNavGroup[] = [
  { label: "대시보드", items: [
    { label: "경영 현황", href: "/mockups/exec", icon: LayoutDashboard },
    { label: "관리 현황", href: "/mockups/manager", icon: LayoutDashboard },
  ]},
  { label: "생산관리", items: [
    { label: "작업지시", href: "/mockups/work-orders", icon: Factory },
    { label: "생산실적", href: "/mockups/production", icon: ClipboardList },
  ]},
  { label: "품질·추적", items: [
    { label: "품질검사", href: "/mockups/quality", icon: ClipboardCheck },
    { label: "Lot 추적", href: "/mockups/genealogy", icon: GitBranch },
  ]},
  { label: "재고관리", items: [
    { label: "재고 현황", href: "/mockups/inventory", icon: Boxes },
  ]},
  { label: "설비관리", items: [
    { label: "설비정비", href: "/mockups/equipment", icon: Wrench },
  ]},
  { label: "시스템", items: [
    { label: "감사로그", href: "/mockups/audit", icon: ScrollText },
  ]},
];

const CRUMB: Record<string, Crumb[]> = {
  "/mockups/exec": [{ label: "대시보드" }, { label: "경영 현황" }],
  "/mockups/manager": [{ label: "대시보드" }, { label: "관리 현황" }],
  "/mockups/work-orders": [{ label: "생산관리" }, { label: "작업지시" }],
  "/mockups/production": [{ label: "생산관리" }, { label: "생산실적" }],
  "/mockups/quality": [{ label: "품질·추적" }, { label: "품질검사" }],
  "/mockups/genealogy": [{ label: "품질·추적" }, { label: "Lot 추적" }],
  "/mockups/inventory": [{ label: "재고관리" }, { label: "재고 현황" }],
  "/mockups/equipment": [{ label: "설비관리" }, { label: "설비정비" }],
  "/mockups/audit": [{ label: "시스템" }, { label: "감사로그" }],
};

export default function MockupsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const groups: SideNavGroup[] = NAV.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it, active: it.href === pathname })),
  }));
  const crumbs = CRUMB[pathname] ?? [{ label: "대시보드" }];

  return (
    <AppShell
      sidebar={
        <SidebarNav
          brand={<><span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-fg">▤</span> 스마트 MES</>}
          groups={groups}
          footer={<a href="/kiosk" className="block rounded-md border border-border px-3 py-2 text-center text-body-sm text-text-muted hover:text-text">🖥 현장 키오스크</a>}
        />
      }
      topbar={
        <Topbar right={<><ConnectionBadge status="connected" label="PLC 연결됨" /><Clock /><UserMenu /><ThemeToggle /></>}>
          <Breadcrumb items={crumbs} />
        </Topbar>
      }
    >
      {children}
    </AppShell>
  );
}
