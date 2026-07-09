import type { Meta, StoryObj } from "@storybook/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const meta: Meta = { title: "Foundation/Select" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Select defaultValue="cnc">
        <SelectTrigger>
          <SelectValue placeholder="작업장 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cnc">CNC 1라인</SelectItem>
          <SelectItem value="press">프레스 2라인</SelectItem>
          <SelectItem value="lathe">선반 3라인</SelectItem>
          <SelectItem value="asm">조립 1라인</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Placeholder: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="작업장 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cnc">CNC 1라인</SelectItem>
          <SelectItem value="press">프레스 2라인</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
