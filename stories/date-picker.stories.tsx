import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { DatePicker } from "@/components/ui/date-picker";

const meta: Meta<typeof DatePicker> = { title: "Data/DatePicker", component: DatePicker };
export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>();
    return <DatePicker value={date} onChange={setDate} aria-label="생산일자" />;
  },
};

export const Preset: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 6, 9));
    return <DatePicker value={date} onChange={setDate} aria-label="생산일자" />;
  },
};
