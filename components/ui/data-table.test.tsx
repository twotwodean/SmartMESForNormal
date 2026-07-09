import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

interface Row { code: string; qty: number; }
const columns: ColumnDef<Row>[] = [
  { accessorKey: "code", header: "지시번호" },
  { accessorKey: "qty", header: "수량" },
];
const data: Row[] = [
  { code: "WO-3", qty: 300 },
  { code: "WO-1", qty: 100 },
  { code: "WO-2", qty: 200 },
];

function bodyRows() {
  const table = screen.getByRole("table");
  const bodies = within(table).getAllByRole("rowgroup");
  // rowgroup[0]=thead, [1]=tbody
  return within(bodies[1]).getAllByRole("row");
}

describe("DataTable", () => {
  it("데이터 행을 렌더한다", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(bodyRows()).toHaveLength(3);
  });

  it("헤더 클릭으로 정렬한다", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} />);
    await user.click(screen.getByRole("button", { name: /지시번호/ }));
    const first = within(bodyRows()[0]).getAllByRole("cell")[0];
    expect(first).toHaveTextContent("WO-1"); // 오름차순 정렬
  });

  it("전역 필터로 행을 좁힌다", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableFilter filterPlaceholder="검색" />);
    await user.type(screen.getByPlaceholderText("검색"), "WO-2");
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0]).toHaveTextContent("WO-2");
  });
});
