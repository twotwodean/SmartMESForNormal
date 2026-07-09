import type { Meta, StoryObj } from "@storybook/react";
import { KPITile } from "@/components/ui/kpi-tile";

const meta: Meta<typeof KPITile> = { title: "Data/KPITile", component: KPITile };
export default meta;
type Story = StoryObj<typeof KPITile>;

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 220px)", gap: 12 }}>
      <KPITile label="계획 대비 실적" value="92.4" unit="%" delta="3.1%p" direction="up" tone="primary" spark={[15, 12, 14, 8, 9, 4]} />
      <KPITile label="설비종합효율 OEE" value="78.4" unit="%" delta="1.2%p" direction="up" tone="ok" spark={[10, 12, 7, 9, 6, 7]} />
      <KPITile label="불량 PPM" value="3,200" delta="420" direction="up" upIsGood={false} tone="warn" spark={[14, 10, 12, 8, 10, 5]} />
      <KPITile label="재고 경고" value="3" unit="건" note="안전재고 미달 2 · 음수 1" tone="crit" />
      <KPITile label="가동 설비" value="14" unit="/16" note="정지 1 · 수리 1" tone="info" />
    </div>
  ),
};
