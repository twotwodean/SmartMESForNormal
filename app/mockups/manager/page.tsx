"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { KPIS, WORK_ORDERS, ALARMS, LINES, type WorkOrder } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

const columns: ColumnDef<WorkOrder>[] = [
  { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
  { accessorKey: "item", header: "품목" },
  { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  {
    accessorKey: "progress",
    header: "진척",
    cell: (c) => {
      const p = c.getValue<number>();
      const wo = c.row.original;
      return (
        <div className="flex items-center gap-2">
          <ProgressBar value={p} tone={workOrderTone(wo.status)} className="w-16" aria-label={`진척률 ${p}%`} />
          <span className="num text-caption text-text-muted">{p}%</span>
        </div>
      );
    },
  },
  { accessorKey: "status", header: "상태", cell: (c) => {
    const s = c.getValue<WorkOrder["status"]>();
    return <StatusPill tone={workOrderTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
  }},
  { accessorKey: "center", header: "작업장" },
];

export default function ManagerDashboard() {
  return (
    <>
      <SectionHeader title="생산 통합 현황" description="2공장 · 실시간 POP · 오늘 08:00–14:32 기준" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <KPITile
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            direction={k.direction}
            upIsGood={k.upIsGood}
            tone={k.tone}
            spark={k.spark}
            note={k.note}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>작업지시</CardTitle>
            <span className="ml-auto text-caption text-text-faint">총 {WORK_ORDERS.length}건</span>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={WORK_ORDERS} enableFilter filterPlaceholder="지시·품목 검색" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>알람 · 이벤트</CardTitle><span className="ml-auto text-caption text-text-faint">활성 {ALARMS.length}</span></CardHeader>
            <CardContent className="p-0">
              {ALARMS.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 border-t border-border px-4 py-3 first:border-t-0">
                  <span className={`mt-1.5 h-2 w-2 flex-none rounded-full bg-${a.tone}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-body-sm font-medium text-text">{a.title}</div>
                    <div className="text-caption text-text-muted">{a.message}</div>
                  </div>
                  <span className="ml-auto whitespace-nowrap text-caption text-text-faint">{a.ago}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>라인 가동률(OEE)</CardTitle><span className="ml-auto text-caption text-text-faint">{LINES.length}개 라인</span></CardHeader>
            <CardContent className="flex flex-wrap justify-around gap-3">
              {LINES.map((l) => (
                <GaugeTile key={l.name} label={l.name} value={l.oee} tone={l.tone} size={96} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
        ⚠ 재고 경고 3건 — SUS-304(180/250), 볼트 M8(90/120), 윤활유(−12) · 발주 검토 필요
      </div>
    </>
  );
}
