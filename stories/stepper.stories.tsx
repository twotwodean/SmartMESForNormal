import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "@/components/ui/stepper";

const meta: Meta<typeof Stepper> = { title: "MES/Stepper", component: Stepper };
export default meta;
type Story = StoryObj<typeof Stepper>;

export const Process: Story = {
  args: { steps: ["절단", "가공", "조립", "검사", "포장"], current: 2 },
};
export const Start: Story = { args: { steps: ["절단", "가공", "조립", "검사", "포장"], current: 0 } };
export const Done: Story = { args: { steps: ["절단", "가공", "조립", "검사", "포장"], current: 4 } };
