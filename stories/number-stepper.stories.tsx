import type { Meta, StoryObj } from "@storybook/react";

import { NumberStepper } from "@/components/ui/number-stepper";

const meta: Meta<typeof NumberStepper> = { title: "Foundation/NumberStepper", component: NumberStepper };
export default meta;
type Story = StoryObj<typeof NumberStepper>;

export const Default: Story = { args: { "aria-label": "수량", defaultValue: 10, min: 0, max: 100, step: 5 } };
export const Kiosk: Story = { args: { "aria-label": "양품 수량", defaultValue: 1148, min: 0, max: 9999, step: 1, kiosk: true } };
export const Disabled: Story = { args: { "aria-label": "수량", defaultValue: 0, disabled: true } };
