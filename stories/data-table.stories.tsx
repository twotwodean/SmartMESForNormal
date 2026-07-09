import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";

interface WO {
  code: string;
  item: string;
  qty: number;
  status: "WAITING" | "RUNNING" | "DONE" | "CANCELLED";
  center: string;
}

const columns: ColumnDef<WO>[] = [
  { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
  { accessorKey: "item", header: "품목" },
  { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  {
    accessorKey: "status",
    header: "상태",
    cell: (c) => {
      const s = c.getValue<WO["status"]>();
      const label = { WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소" }[s];
      return <StatusPill tone={workOrderTone(s)}>{label}</StatusPill>;
    },
  },
  { accessorKey: "center", header: "작업장" },
];

const data: WO[] = [
  { code: "WO-260709-014", item: "브라켓 ASSY (RF-L)", qty: 1200, status: "RUNNING", center: "CNC 1라인" },
  { code: "WO-260709-013", item: "하우징 커버 M3", qty: 800, status: "DONE", center: "프레스 2라인" },
  { code: "WO-260709-012", item: "샤프트 SUS-304", qty: 450, status: "RUNNING", center: "선반 3라인" },
  { code: "WO-260709-011", item: "기어박스 GB-2500", qty: 300, status: "WAITING", center: "조립 1라인" },
  { code: "WO-260709-009", item: "커넥터 하네스", qty: 2000, status: "CANCELLED", center: "—" },
];

const meta: Meta<typeof DataTable<WO, unknown>> = { title: "Data/DataTable", component: DataTable };
export default meta;
type Story = StoryObj<typeof DataTable<WO, unknown>>;

export const Basic: Story = { args: { columns, data } };
export const Sortable: Story = { args: { columns, data, enableFilter: true, filterPlaceholder: "지시·품목 검색" } };
export const Paginated: Story = { args: { columns, data, enablePagination: true, pageSize: 3, enableFilter: true } };
export const Empty: Story = { args: { columns, data: [], emptyMessage: "작업지시가 없습니다." } };
export const Selectable: Story = { args: { columns, data, enableRowSelection: true } };
