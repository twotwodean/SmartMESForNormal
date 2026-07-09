import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const meta: Meta<typeof Input> = { title: "Foundation/Input", component: Input };
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: "품목명 입력" } };
export const Disabled: Story = { args: { placeholder: "비활성", disabled: true } };
export const WithValue: Story = { args: { defaultValue: "브라켓 ASSY (RF-L)" } };
export const TextareaStory: Story = {
  name: "Textarea",
  render: () => <Textarea placeholder="비고 입력" style={{ width: 320 }} />,
};
