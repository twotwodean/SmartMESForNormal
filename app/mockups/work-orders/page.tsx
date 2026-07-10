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
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerBody,
} from "@/components/ui/drawer";
import { WORK_ORDERS, type WorkOrder, type WorkOrderStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

const KANBAN_COLS: { status: WorkOrderStatus; title: string }[] = [
  { status: "WAITING", title: "대기" },
  { status: "RUNNING", title: "진행" },
  { status: "DONE", title: "완료" },
];

const PROCESS_STEPS = ["절단", "가공", "조립", "검사", "포장"];
function progressToStep(progress: number): number {
  return Math.min(PROCESS_STEPS.length - 1, Math.max(0, Math.floor(progress / 20)));
}

export default function WorkOrdersPage() {
  const [selected, setSelected] = React.useState<WorkOrder | null>(null);
  const open = selected !== null;

  const columns: ColumnDef<WorkOrder>[] = [
    { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "item", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "status", header: "상태", cell: (c) => {
      const s = c.getValue<WorkOrderStatus>();
      return <StatusPill tone={workOrderTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
    }},
    { accessorKey: "center", header: "작업장" },
    { id: "action", header: "", cell: (c) => (
      <Button variant="ghost" size="sm" onClick={() => setSelected(c.row.original)}>상세</Button>
    )},
  ];

  return (
    <>
      <SectionHeader title="작업지시" description="리스트·칸반 뷰 · 클릭 시 상세" />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">리스트</TabsTrigger>
          <TabsTrigger value="kanban">칸반</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <DataTable columns={columns} data={WORK_ORDERS} enableFilter filterPlaceholder="지시·품목 검색" />
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {KANBAN_COLS.map((col) => {
              const items = WORK_ORDERS.filter((w) => w.status === col.status);
              return (
                <div key={col.status} className="rounded-lg border border-border bg-bg/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-body-sm font-semibold text-text">{col.title}</span>
                    <span className="num text-caption text-text-faint">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((w) => (
                      <WorkOrderCard
                        key={w.code}
                        code={w.code}
                        item={w.item}
                        qty={w.qty}
                        progress={w.progress}
                        statusLabel={STATUS_LABEL[w.status]}
                        tone={workOrderTone(w.status)}
                        center={w.center}
                        onClick={() => setSelected(w)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Drawer open={open} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{selected?.code} 상세</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            {selected && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <StatusPill tone={workOrderTone(selected.status)}>{STATUS_LABEL[selected.status]}</StatusPill>
                  <span className="text-body-sm text-text">{selected.item}</span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-body-sm">
                  <dt className="text-text-muted">수량</dt><dd className="num text-text">{selected.qty.toLocaleString()} EA</dd>
                  <dt className="text-text-muted">작업장</dt><dd className="text-text">{selected.center}</dd>
                  <dt className="text-text-muted">진척</dt><dd className="num text-text">{selected.progress}%</dd>
                </dl>
                <div>
                  <div className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-faint">공정 진행</div>
                  <Stepper steps={PROCESS_STEPS} current={progressToStep(selected.progress)} />
                </div>
              </div>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
