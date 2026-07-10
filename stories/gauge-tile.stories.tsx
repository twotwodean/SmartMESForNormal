import type { Meta, StoryObj } from "@storybook/react";
import { GaugeTile } from "@/components/ui/gauge-tile";

const meta: Meta<typeof GaugeTile> = { title: "MES/GaugeTile", component: GaugeTile };
export default meta;
type Story = StoryObj<typeof GaugeTile>;

export const OEE: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16 }}>
      <GaugeTile label="CNC 1라인 OEE" value={86} tone="ok" />
      <GaugeTile label="선반 3라인 OEE" value={64} tone="warn" />
      <GaugeTile label="조립 1라인 OEE" value={42} tone="crit" />
    </div>
  ),
};
