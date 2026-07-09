import type { Meta, StoryObj } from "@storybook/react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

const meta: Meta<typeof Button> = { title: "Foundation/Button", component: Button };
export default meta;
type Story = StoryObj<typeof Button>;

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button variant="primary">등록</Button>
      <Button variant="secondary">취소</Button>
      <Button variant="ghost">더보기</Button>
      <Button variant="danger">삭제</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const Disabled: Story = { args: { children: "비활성", disabled: true } };

export const Icons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button variant="primary"><Plus size={16} /> 추가</Button>
      <IconButton aria-label="삭제" variant="danger"><Trash2 size={16} /></IconButton>
    </div>
  ),
};
