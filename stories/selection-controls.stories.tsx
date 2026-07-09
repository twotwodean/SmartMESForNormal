import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

const meta: Meta = { title: "Foundation/SelectionControls" };
export default meta;
type Story = StoryObj;

export const Checkboxes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><Checkbox defaultChecked /> 사용</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><Checkbox /> 미사용</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><Checkbox disabled /> 비활성</label>
    </div>
  ),
};

export const Radios: Story = {
  render: () => (
    <RadioGroup defaultValue="prod">
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><RadioGroupItem value="prod" /> 완제품</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><RadioGroupItem value="semi" /> 반제품</label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}><RadioGroupItem value="raw" /> 원자재</label>
    </RadioGroup>
  ),
};

export const Switches: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      <Switch defaultChecked />
      <Switch />
      <Switch disabled />
    </div>
  ),
};
