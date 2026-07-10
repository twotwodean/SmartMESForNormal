import type { Meta, StoryObj } from "@storybook/react";
import { WorkOrderCard } from "@/components/ui/work-order-card";

const meta: Meta<typeof WorkOrderCard> = { title: "MES/WorkOrderCard", component: WorkOrderCard };
export default meta;
type Story = StoryObj<typeof WorkOrderCard>;

export const Kanban: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 220px)", gap: 12, alignItems: "start" }}>
      <WorkOrderCard code="WO-260709-011" item="기어박스 GB-2500" qty={300} statusLabel="대기" tone="warn" center="조립 1라인" />
      <WorkOrderCard code="WO-260709-014" item="브라켓 ASSY (RF-L)" qty={1200} progress={72} statusLabel="진행" tone="primary" center="CNC 1라인" onClick={() => {}} />
      <WorkOrderCard code="WO-260709-013" item="하우징 커버 M3" qty={800} progress={100} statusLabel="완료" tone="ok" center="프레스 2라인" />
    </div>
  ),
};
