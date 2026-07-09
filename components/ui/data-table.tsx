"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableFilter?: boolean;
  filterPlaceholder?: string;
  enablePagination?: boolean;
  pageSize?: number;
  stickyHeader?: boolean;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableFilter = false,
  filterPlaceholder = "검색…",
  enablePagination = false,
  pageSize = 10,
  stickyHeader = false,
  emptyMessage = "데이터가 없습니다.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    initialState: enablePagination ? { pagination: { pageSize } } : undefined,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-3">
      {enableFilter && (
        <Input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={filterPlaceholder}
          className="max-w-xs"
        />
      )}

      <div className={cn("rounded-lg border border-border", stickyHeader && "max-h-[480px] overflow-y-auto")}>
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-surface")}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const ariaSort = canSort
                    ? sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : "none"
                    : undefined;
                  return (
                    <TableHead key={header.id} aria-sort={ariaSort}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ChevronUp size={13} aria-hidden />
                          ) : sorted === "desc" ? (
                            <ChevronDown size={13} aria-hidden />
                          ) : (
                            <ChevronsUpDown size={13} className="text-text-faint" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-text-muted">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <div className="flex items-center justify-between">
          <span className="text-caption text-text-muted num">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 페이지 · 총 {table.getFilteredRowModel().rows.length}건
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              이전
            </Button>
            <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
