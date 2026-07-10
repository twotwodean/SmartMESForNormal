import type { Meta, StoryObj } from "@storybook/react";
import { LayoutDashboard, Factory, PackageSearch, Boxes, Wrench, Database } from "lucide-react";
import { AppShell, SidebarNav, Topbar } from "@/components/ui/app-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ConnectionBadge } from "@/components/ui/connection-badge";
import { Clock } from "@/components/ui/clock";
import { ThemeToggle } from "@/components/theme-toggle";
import { SectionHeader } from "@/components/ui/section-header";

const groups = [
  { label: "대시보드", items: [{ label: "통합 현황", icon: LayoutDashboard, href: "#", active: true }] },
  { label: "생산관리", items: [{ label: "생산계획", icon: Factory, href: "#" }, { label: "작업지시", icon: Factory, href: "#" }, { label: "생산실적", icon: Factory, href: "#" }] },
  { label: "품질·추적", items: [{ label: "Lot 추적", icon: PackageSearch, href: "#" }, { label: "검사·부적합", icon: PackageSearch, href: "#" }] },
  { label: "재고관리", items: [{ label: "재고 현황", icon: Boxes, href: "#" }] },
  { label: "설비관리", items: [{ label: "설비 정비", icon: Wrench, href: "#" }] },
  { label: "기준정보", items: [{ label: "품목 / BOM", icon: Database, href: "#" }] },
];

const meta: Meta = { title: "Layout/AppShell", parameters: { layout: "fullscreen" } };
export default meta;
type Story = StoryObj;

export const Full: Story = {
  render: () => (
    <AppShell
      sidebar={<SidebarNav brand={<><span>▤</span> 스마트 MES</>} groups={groups} footer={<a href="#" className="block rounded-md border border-border px-3 py-2 text-center text-body-sm text-text-muted">🖥 현장 키오스크</a>} />}
      topbar={
        <Topbar
          right={<><ConnectionBadge status="connected" label="PLC 연결됨" /><Clock /><ThemeToggle /></>}
        >
          <Breadcrumb items={[{ label: "대시보드", href: "#" }, { label: "통합 현황" }]} />
        </Topbar>
      }
    >
      <SectionHeader title="생산 통합 현황" description="2공장 · 실시간 POP" />
      <p className="text-body-sm text-text-muted">여기에 KPI 타일·DataTable 등 콘텐츠가 조립됩니다.</p>
    </AppShell>
  ),
};
