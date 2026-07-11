"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import type { LotRef } from "@/lib/services/lot-service";

function lotTone(status: string): Tone {
  if (status === "PASSED") return "ok";
  if (status === "FAILED") return "crit";
  if (status === "IN_PROGRESS") return "primary";
  return "neutral";
}

/** 로트 라벨 인쇄 라우트를 새 탭에서 연다(LBL-1: /print/labels). */
function openLabelPrint(ids: string[]): void {
  if (ids.length === 0) return;
  const url = `/print/labels?ids=${ids.map(encodeURIComponent).join(",")}&type=lot`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function LabelsClient({ lots }: { lots: LotRef[] }) {
  // DataTable의 enableRowSelection은 선택 상태를 내부에 캡슐화하고 있어 상위로 노출하는 콜백이 없다.
  // 발행 버튼이 선택된 id 목록을 알아야 하므로 로컬 Set으로 직접 관리한다.
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const toggleOne = React.useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allSelected = lots.length > 0 && lots.every((l) => selected.has(l.id));
  const someSelected = lots.some((l) => selected.has(l.id));

  const toggleAll = React.useCallback(
    (checked: boolean) => {
      setSelected(checked ? new Set(lots.map((l) => l.id)) : new Set());
    },
    [lots],
  );

  const columns = React.useMemo<ColumnDef<LotRef>[]>(
    () => [
      {
        id: "__select",
        enableSorting: false,
        header: () => (
          <Checkbox
            aria-label="전체 선택"
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(v) => toggleAll(v === true)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`${row.original.code} 선택`}
            checked={selected.has(row.original.id)}
            onCheckedChange={(v) => toggleOne(row.original.id, v === true)}
          />
        ),
      },
      {
        accessorKey: "code",
        header: "로트번호",
        cell: (c) => <span className="font-mono text-body-sm text-text">{c.getValue<string>()}</span>,
      },
      { accessorKey: "itemName", header: "품목" },
      {
        accessorKey: "status",
        header: "상태",
        cell: (c) => {
          const s = c.getValue<string>();
          return <StatusPill tone={lotTone(s)}>{s}</StatusPill>;
        },
      },
      {
        id: "actions",
        header: "액션",
        cell: (c) => (
          <Button size="sm" variant="secondary" onClick={() => openLabelPrint([c.row.original.id])}>
            <Printer size={14} aria-hidden /> 라벨
          </Button>
        ),
      },
    ],
    [allSelected, someSelected, selected, toggleOne, toggleAll],
  );

  const selectedCount = selected.size;

  return (
    <>
      <SectionHeader
        title="라벨 발행"
        description="로트 선택 후 바코드 라벨 인쇄"
        actions={
          <Button
            onClick={() => openLabelPrint(Array.from(selected))}
            disabled={selectedCount === 0}
          >
            <Printer size={16} aria-hidden /> 선택 라벨 발행 ({selectedCount})
          </Button>
        }
      />

      <p className="mb-2 text-caption text-text-muted">
        선택됨 {selectedCount}건 / 총 {lots.length}건
      </p>

      <DataTable
        columns={columns}
        data={lots}
        enableFilter
        filterPlaceholder="로트번호·품목 검색"
        emptyMessage="발행할 로트가 없습니다."
      />
    </>
  );
}
