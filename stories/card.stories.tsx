import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";

const meta: Meta = { title: "Layout/Card" };
export default meta;
type Story = StoryObj;

export const Panel: Story = {
  render: () => (
    <Card style={{ width: 360 }}>
      <CardHeader>
        <CardTitle>작업지시</CardTitle>
        <span className="ml-auto text-caption text-text-faint">진행 5 · 대기 3</span>
      </CardHeader>
      <CardContent>
        <p className="text-body-sm text-text-muted">패널 본문 영역. 조밀한 테이블·리스트가 들어갑니다.</p>
      </CardContent>
    </Card>
  ),
};

export const PageHeader: Story = {
  render: () => (
    <div style={{ width: 720 }}>
      <SectionHeader
        title="생산 통합 현황"
        description="2공장 · 실시간 POP · 오늘 08:00–14:32 기준"
        actions={<><Button variant="secondary" size="sm">내보내기</Button><Button size="sm">새 작업지시</Button></>}
      />
    </div>
  ),
};
