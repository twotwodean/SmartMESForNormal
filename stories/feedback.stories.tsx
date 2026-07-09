import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PackageSearch } from "lucide-react";

const meta: Meta = { title: "Data/Feedback" };
export default meta;
type Story = StoryObj;

export const Progress: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 260 }}>
      <ProgressBar value={72} tone="primary" aria-label="진척률 72%" />
      <ProgressBar value={100} tone="ok" aria-label="완료" />
      <ProgressBar value={42} tone="crit" aria-label="가동률 42%" />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ width: 420 }}>
      <EmptyState
        icon={PackageSearch}
        title="작업지시가 없습니다"
        description="선택한 기간·작업장에 해당하는 작업지시가 없습니다. 조건을 바꾸거나 새 지시를 발행하세요."
        action={<Button size="sm">작업지시 발행</Button>}
      />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, width: 320 }}>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};
