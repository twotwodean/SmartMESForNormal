"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, workOrderTone, type Tone } from "@/components/ui/status-pill";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { KPIS, LINES } from "@/lib/mock-data";
import type { DashboardData } from "@/lib/services/dashboard-service";
import type { WorkOrderRow } from "@/lib/services/work-order-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

const columns: ColumnDef<WorkOrderRow>[] = [
  { accessorKey: "code", header: "지시번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
  { accessorKey: "itemName", header: "품목" },
  { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  { accessorKey: "status", header: "상태", cell: (c) => {
    const s = c.getValue<WorkOrderStatus>();
    return <StatusPill tone={workOrderTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
  }},
  { accessorKey: "center", header: "작업장" },
];

export function ManagerClient({ dashboard, workOrders }: { dashboard: DashboardData; workOrders: WorkOrderRow[] }) {
  const stockWarnCount = dashboard.stockWarnings.length;
  const overallPpm = dashboard.quality.overallPpm;
  const ppmTone: Tone = overallPpm >= 10000 ? "crit" : overallPpm >= 3000 ? "warn" : "ok";
  const mttrTone: Tone = dashboard.equipment.mttrMin > 120 ? "warn" : "ok";

  return (
    <>
      <SectionHeader title="생산 통합 현황" description="2공장 · 실시간 POP · 오늘 08:00–14:32 기준" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k) => {
          if (k.key === "stock") {
            return <KPITile key={k.key} label={k.label} value={String(stockWarnCount)} unit={k.unit} tone={k.tone} note={k.note} />;
          }
          if (k.key === "ppm") {
            // 불량 PPM: 실데이터(quality-service) 연동
            return <KPITile key={k.key} label={k.label} value={overallPpm.toLocaleString()} tone={ppmTone} />;
          }
          // R3: 계획대비실적·OEE·가동설비 실데이터 연동 예정
          return (
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
          );
        })}
        <KPITile
          label="설비 MTTR"
          value={String(dashboard.equipment.mttrMin)}
          unit="분"
          tone={mttrTone}
          note={`정비중 ${dashboard.equipment.openMaintenance}건`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>작업지시</CardTitle>
            <span className="ml-auto text-caption text-text-faint">총 {workOrders.length}건</span>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={workOrders} enableFilter filterPlaceholder="지시·품목 검색" />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>알람 · 이벤트</CardTitle><span className="ml-auto text-caption text-text-faint">활성 {dashboard.alarms.length}</span></CardHeader>
            <CardContent className="p-0">
              {dashboard.alarms.length === 0 && (
                <div className="px-4 py-6 text-center text-caption text-text-faint">활성 알람 없음</div>
              )}
              {dashboard.alarms.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 border-t border-border px-4 py-3 first:border-t-0">
                  <span className={`mt-1.5 h-2 w-2 flex-none rounded-full bg-${a.tone}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-body-sm font-medium text-text">{a.title}</div>
                    <div className="text-caption text-text-muted">{a.message}</div>
                  </div>
                  <span className="ml-auto whitespace-nowrap text-caption text-text-faint">{a.createdAt.slice(0, 16).replace("T", " ")}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* R3: 라인별 OEE 실데이터 예정 */}
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

      {stockWarnCount > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
          ⚠ 재고 경고 {stockWarnCount}건 — {dashboard.stockWarnings.map((s) => s.code).join(", ")} · 발주 검토 필요
        </div>
      )}
    </>
  );
}
