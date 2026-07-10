"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, stockTone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody,
} from "@/components/ui/drawer";
import { INVENTORY, type InventoryItem, type StockStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<StockStatus, string> = {
  NORMAL: "정상", BELOW: "미달", NEGATIVE: "음수",
};

// 정적 수불 이력(샘플)
const TXNS = [
  { date: "2026-07-09 14:10", type: "출고", qty: -120, ref: "WO-260709-014" },
  { date: "2026-07-09 09:32", type: "입고", qty: 500, ref: "GR-260709-002" },
  { date: "2026-07-08 16:05", type: "조정", qty: -8, ref: "ADJ-260708-001" },
];

const warnCount = INVENTORY.filter((i) => i.status !== "NORMAL").length;

export default function InventoryPage() {
  const [selected, setSelected] = React.useState<InventoryItem | null>(null);

  const columns: ColumnDef<InventoryItem>[] = [
    { accessorKey: "code", header: "품목코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "qty", header: "현재고", cell: (c) => {
      const v = c.getValue<number>();
      return <span className={`num ${v < 0 ? "text-crit font-semibold" : "text-text"}`}>{v.toLocaleString()}</span>;
    }},
    { accessorKey: "safety", header: "안전재고", cell: (c) => <span className="num text-text-muted">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "uom", header: "단위" },
    { accessorKey: "status", header: "상태", cell: (c) => {
      const s = c.getValue<StockStatus>();
      return <StatusPill tone={stockTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
    }},
    { id: "action", header: "", cell: (c) => (
      <Button variant="ghost" size="sm" onClick={() => setSelected(c.row.original)}>수불</Button>
    )},
  ];

  return (
    <>
      <SectionHeader title="재고 현황" description="품목별 현재고·안전재고 · 품목 클릭 시 수불 이력" />

      {warnCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
          ⚠ 재고 경고 {warnCount}건 — 안전재고 미달·음수 품목이 있습니다. 발주를 검토하세요.
        </div>
      )}

      <Card>
        <CardContent>
          <DataTable columns={columns} data={INVENTORY} enableFilter filterPlaceholder="품목 검색" />
        </CardContent>
      </Card>

      <Drawer open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{selected?.name} 수불 이력</DrawerTitle></DrawerHeader>
          <DrawerBody>
            {selected && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <StatusPill tone={stockTone(selected.status)}>{STATUS_LABEL[selected.status]}</StatusPill>
                  <span className="num text-body-sm text-text">현재고 {selected.qty.toLocaleString()} {selected.uom} / 안전 {selected.safety.toLocaleString()}</span>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {TXNS.map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-body-sm">
                      <span className="num text-text-muted">{t.date}</span>
                      <span className="text-text">{t.type}</span>
                      <span className={`num font-semibold ${t.qty < 0 ? "text-crit" : "text-ok"}`}>{t.qty > 0 ? "+" : ""}{t.qty}</span>
                      <span className="font-mono text-caption text-text-faint">{t.ref}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
