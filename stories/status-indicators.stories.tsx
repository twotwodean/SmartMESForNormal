import type { Meta, StoryObj } from "@storybook/react";
import { ConnectionBadge } from "@/components/ui/connection-badge";
import { Clock } from "@/components/ui/clock";

const meta: Meta = { title: "Layout/StatusIndicators" };
export default meta;
type Story = StoryObj;

export const Connection: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 10 }}>
      <ConnectionBadge status="connected" label="PLC 연결됨" />
      <ConnectionBadge status="reconnecting" />
      <ConnectionBadge status="disconnected" />
    </div>
  ),
};

export const LiveClock: Story = { render: () => <Clock /> };
