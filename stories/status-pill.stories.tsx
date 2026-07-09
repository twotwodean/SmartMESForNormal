import type { Meta, StoryObj } from "@storybook/react";
import { StatusPill } from "@/components/ui/status-pill";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof StatusPill> = { title: "Foundation/StatusPill", component: StatusPill };
export default meta;
type Story = StoryObj<typeof StatusPill>;

export const Tones: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <StatusPill tone="warn">대기</StatusPill>
      <StatusPill tone="primary">진행</StatusPill>
      <StatusPill tone="ok">완료</StatusPill>
      <StatusPill tone="neutral">취소</StatusPill>
      <StatusPill tone="crit">불량</StatusPill>
      <StatusPill tone="info">이동</StatusPill>
    </div>
  ),
};

export const NoDot: Story = { args: { tone: "ok", dot: false, children: "합격" } };

export const Badges: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Badge>원자재</Badge>
      <Badge>반제품</Badge>
      <Badge>완제품</Badge>
    </div>
  ),
};
