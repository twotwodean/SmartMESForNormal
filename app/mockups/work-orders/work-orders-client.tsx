"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { WorkOrderCard } from "@/components/ui/work-order-card";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody } from "@/components/ui/drawer";
import type { WorkOrderRow } from "@/lib/services/work-order-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

const LABEL: Record<WorkOrderStatus, string> = { WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소" };
const COLS: { status: WorkOrderStatus; title: string }[] = [
  { status: "WAITING", title: "대기" }, { status: "RUNNING", title: "진행" }, { status: "DONE", title: "완료" },
];
const STEPS = ["절단", "가공", "조립", "검사", "포장"];
const stepFor = (s: WorkOrderStatus) => (s === "DONE" ? 4 : s === "RUNNING" ? 2 : 0);

export function WorkOrdersClient({ rows }: { rows: WorkOrderRow[] }) {
  const [sel, setSel] = React.useState<WorkOrderRow | null>(null);
  const columns: ColumnDef<WorkOrderRow>[] = [
    { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "status", header: "상태", cell: (c) => { const s = c.getValue<WorkOrderStatus>(); return <StatusPill tone={workOrderTone(s)}>{LABEL[s]}</StatusPill>; } },
    { accessorKey: "center", header: "작업장" },
    { id: "act", header: "", cell: (c) => <Button variant="ghost" size="sm" onClick={() => setSel(c.row.original)}>상세</Button> },
  ];
  return (
    <>
      <SectionHeader title="작업지시" description="실 데이터 · 리스트/칸반 · 클릭 시 상세" />
      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">리스트</TabsTrigger><TabsTrigger value="kanban">칸반</TabsTrigger></TabsList>
        <TabsContent value="list"><DataTable columns={columns} data={rows} enableFilter filterPlaceholder="지시·품목 검색" /></TabsContent>
        <TabsContent value="kanban">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLS.map((col) => {
              const items = rows.filter((w) => w.status === col.status);
              return (
                <div key={col.status} className="rounded-lg border border-border bg-bg/40 p-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-body-sm font-semibold text-text">{col.title}</span><span className="num text-caption text-text-faint">{items.length}</span></div>
                  <div className="flex flex-col gap-2">
                    {items.map((w) => <WorkOrderCard key={w.code} code={w.code} item={w.itemName} qty={w.qty} statusLabel={LABEL[w.status]} tone={workOrderTone(w.status)} center={w.center} onClick={() => setSel(w)} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <Drawer open={sel !== null} onOpenChange={(o) => { if (!o) setSel(null); }}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>{sel?.code} 상세</DrawerTitle></DrawerHeader>
          <DrawerBody>
            {sel && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2"><StatusPill tone={workOrderTone(sel.status)}>{LABEL[sel.status]}</StatusPill><span className="text-body-sm text-text">{sel.itemName}</span></div>
                <dl className="grid grid-cols-2 gap-2 text-body-sm">
                  <dt className="text-text-muted">수량</dt><dd className="num text-text">{sel.qty.toLocaleString()} EA</dd>
                  <dt className="text-text-muted">작업장</dt><dd className="text-text">{sel.center}</dd>
                </dl>
                <div><div className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-faint">공정 진행</div><Stepper steps={STEPS} current={stepFor(sel.status)} /></div>
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
