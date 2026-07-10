import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

function Demo() {
  const { toast } = useToast();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={() => toast({ title: "저장됨", description: "실적이 등록되었습니다.", tone: "ok" })}>성공</Button>
      <Button variant="secondary" onClick={() => toast({ title: "안전재고 미달", description: "SUS-304 180/250", tone: "warn" })}>경고</Button>
      <Button variant="danger" onClick={() => toast({ title: "설비 정지", description: "CNC-03 주축 과부하", tone: "crit" })}>이상</Button>
    </div>
  );
}

const meta: Meta = { title: "Layout/Toast" };
export default meta;
type Story = StoryObj;

export const Triggers: Story = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
};
