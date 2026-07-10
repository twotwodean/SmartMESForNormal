import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { KioskNumpad } from "@/components/ui/kiosk-numpad";

const meta: Meta<typeof KioskNumpad> = { title: "MES/KioskNumpad", component: KioskNumpad };
export default meta;
type Story = StoryObj<typeof KioskNumpad>;

export const Default: Story = {
  render: () => {
    const [v, setV] = React.useState(0);
    return <KioskNumpad value={v} onChange={setV} aria-label="양품 수량" />;
  },
};
