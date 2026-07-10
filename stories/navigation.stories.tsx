import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const meta: Meta = { title: "Layout/Navigation" };
export default meta;
type Story = StoryObj;

export const Breadcrumbs: Story = {
  render: () => (
    <Breadcrumb items={[{ label: "생산관리", href: "#" }, { label: "작업지시", href: "#" }, { label: "WO-260709-014" }]} />
  ),
};

export const TabViews: Story = {
  render: () => (
    <Tabs defaultValue="list" style={{ width: 480 }}>
      <TabsList>
        <TabsTrigger value="list">리스트</TabsTrigger>
        <TabsTrigger value="kanban">칸반</TabsTrigger>
        <TabsTrigger value="gantt">간트</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><p className="text-body-sm text-text-muted">리스트 뷰(DataTable)</p></TabsContent>
      <TabsContent value="kanban"><p className="text-body-sm text-text-muted">칸반 뷰(WorkOrderCard)</p></TabsContent>
      <TabsContent value="gantt"><p className="text-body-sm text-text-muted">간트 뷰(후속)</p></TabsContent>
    </Tabs>
  ),
};
