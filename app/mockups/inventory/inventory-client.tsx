"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, stockTone } from "@/components/ui/status-pill";
import type { StockRow } from "@/lib/services/inventory-service";
import type { StockStatus } from "@/lib/domain/types";

const STATUS_LABEL: Record<StockStatus, string> = { NORMAL: "정상", BELOW: "미달", NEGATIVE: "음수" };

export function InventoryClient({ rows }: { rows: StockRow[] }) {
  const warn = rows.filter((r) => r.status !== "NORMAL").length;
  const columns: ColumnDef<StockRow>[] = [
    { accessorKey: "code", header: "품목코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "qty", header: "현재고", cell: (c) => { const v = c.getValue<number>(); return <span className={`num ${v < 0 ? "text-crit font-semibold" : "text-text"}`}>{v.toLocaleString()}</span>; } },
    { accessorKey: "safety", header: "안전재고", cell: (c) => <span className="num text-text-muted">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "uom", header: "단위" },
    { accessorKey: "status", header: "상태", cell: (c) => { const s = c.getValue<StockStatus>(); return <StatusPill tone={stockTone(s)}>{STATUS_LABEL[s]}</StatusPill>; } },
  ];
  return (
    <>
      <SectionHeader title="재고 현황" description="실시간 파생 현재고(수불 합계) · 안전재고 대비" />
      {warn > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
          ⚠ 재고 경고 {warn}건 — 안전재고 미달·음수 품목이 있습니다.
        </div>
      )}
      <Card><CardContent><DataTable columns={columns} data={rows} enableFilter filterPlaceholder="품목 검색" /></CardContent></Card>
    </>
  );
}
