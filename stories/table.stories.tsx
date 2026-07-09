import type { Meta, StoryObj } from "@storybook/react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";

const meta: Meta = { title: "Data/Table" };
export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>지시번호</TableHead>
          <TableHead>품목</TableHead>
          <TableHead>수량</TableHead>
          <TableHead>상태</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-mono text-caption">WO-260709-014</TableCell>
          <TableCell>브라켓 ASSY (RF-L)</TableCell>
          <TableCell className="num">1,200</TableCell>
          <TableCell><StatusPill tone="primary">진행</StatusPill></TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-mono text-caption">WO-260709-013</TableCell>
          <TableCell>하우징 커버 M3</TableCell>
          <TableCell className="num">800</TableCell>
          <TableCell><StatusPill tone="ok">완료</StatusPill></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
