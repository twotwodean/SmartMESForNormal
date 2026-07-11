"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { KPITile } from "@/components/ui/kpi-tile";
import type { MrpRow, MrpSuggestion } from "@/lib/services/mrp-service";

const SUGGESTION_LABEL: Record<MrpSuggestion, string> = {
  PURCHASE: "구매",
  PRODUCE: "생산",
  NONE: "-",
};

function suggestionTone(s: MrpSuggestion): Tone {
  const map: Record<MrpSuggestion, Tone> = { PURCHASE: "warn", PRODUCE: "primary", NONE: "neutral" };
  return map[s];
}

export function MrpClient({ rows }: { rows: MrpRow[] }) {
  const router = useRouter();

  const netCount = rows.filter((r) => r.net > 0).length;
  const purchaseCount = rows.filter((r) => r.suggestion === "PURCHASE").length;
  const produceCount = rows.filter((r) => r.suggestion === "PRODUCE").length;

  const columns: ColumnDef<MrpRow>[] = [
    { accessorKey: "code", header: "품목코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "gross", header: "총소요", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "onHand", header: "현재고", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "safety", header: "안전재고", cell: (c) => <span className="num text-text-muted">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "incoming", header: "입고예정", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    {
      accessorKey: "net",
      header: "순소요",
      cell: (c) => {
        const v = c.getValue<number>();
        return <span className={`num ${v > 0 ? "font-semibold text-crit" : "text-text"}`}>{v.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: "suggestion",
      header: "제안",
      cell: (c) => {
        const s = c.getValue<MrpSuggestion>();
        return <StatusPill tone={suggestionTone(s)}>{SUGGESTION_LABEL[s]}</StatusPill>;
      },
    },
  ];

  return (
    <>
      <SectionHeader
        title="자재 · 소요량 산출(MRP)"
        description="수주·BOM 전개 대비 현재고·입고예정 → 순소요"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
            새로고침
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPITile label="순소요 발생 품목" value={netCount.toLocaleString()} unit="종" tone="info" />
        <KPITile label="구매 제안" value={purchaseCount.toLocaleString()} unit="종" tone="warn" />
        <KPITile label="생산 제안" value={produceCount.toLocaleString()} unit="종" tone="primary" />
      </div>

      <Card>
        <CardContent>
          <DataTable columns={columns} data={rows} enableFilter filterPlaceholder="품목코드·품목명 검색" />
        </CardContent>
      </Card>
    </>
  );
}
