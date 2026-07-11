"use client";

import * as React from "react";

import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { ConnectionBadge, type ConnectionStatus } from "@/components/ui/connection-badge";
import { useLiveExec, type LiveStatus } from "@/components/app/use-live-exec";
import type { ExecSummary, ExecDowntimeReason, ExecWipByWorkCenter } from "@/lib/services/exec-service";

const LIVE_BADGE: Record<LiveStatus, { status: ConnectionStatus; label: string }> = {
  live: { status: "connected", label: "실시간" },
  connecting: { status: "reconnecting", label: "연결 중" },
  offline: { status: "disconnected", label: "오프라인" },
};

function ppmTone(ppmValue: number): Tone {
  if (ppmValue >= 10000) return "crit";
  if (ppmValue >= 3000) return "warn";
  return "ok";
}

function oeeTone(oeePct: number): Tone {
  if (oeePct >= 85) return "ok";
  if (oeePct >= 60) return "warn";
  return "crit";
}

const CATEGORY_LABEL: Record<string, string> = { PLANNED: "계획", UNPLANNED: "비계획" };
function categoryTone(category: string): Tone {
  return category === "PLANNED" ? "info" : "warn";
}

function DowntimeParetoRow({ row, maxDowntimeMin }: { row: ExecDowntimeReason; maxDowntimeMin: number }) {
  const barValue = maxDowntimeMin > 0 ? (row.downtimeMin / maxDowntimeMin) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-body-sm font-semibold text-text">{row.label}</span>
        <StatusPill tone={categoryTone(row.category)}>{CATEGORY_LABEL[row.category] ?? row.category}</StatusPill>
        <span className="ml-auto num text-caption text-text-muted">
          {row.downtimeMin.toLocaleString()}분 · {row.count.toLocaleString()}건
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ProgressBar value={barValue} tone={categoryTone(row.category)} className="flex-1" aria-label={`${row.label} 정지시간 비중`} />
        <span className="num shrink-0 text-caption text-text-muted">누적 {row.cumulativePct}%</span>
      </div>
    </div>
  );
}

function WipWorkCenterRow({ row, maxWipQty }: { row: ExecWipByWorkCenter; maxWipQty: number }) {
  const barValue = maxWipQty > 0 ? (row.wipQty / maxWipQty) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-body-sm font-semibold text-text">{row.name}</span>
        <span className="font-mono text-caption text-text-muted">{row.code}</span>
        <span className="ml-auto num text-caption text-text-muted">{row.wipQty.toLocaleString()} EA</span>
      </div>
      <ProgressBar value={barValue} tone="primary" aria-label={`${row.name} 재공수량 비중`} />
    </div>
  );
}

function ExecInner({ initial }: { initial: ExecSummary }) {
  const { data, status } = useLiveExec(initial);
  const badge = LIVE_BADGE[status];

  const totalEquipment = data.oee.perEquipment.length;
  const onlineCount = data.oee.perEquipment.filter((e) => e.online).length;
  const openWorkOrders = data.workOrders.byStatus.WAITING + data.workOrders.byStatus.RUNNING;
  const maxDowntimeMin = data.downtimePareto.length > 0 ? data.downtimePareto[0].downtimeMin : 0;
  const maxWipQty = data.wip.byWorkCenter.reduce((max, c) => Math.max(max, c.wipQty), 0);

  return (
    <>
      <SectionHeader
        title="경영 현황"
        description="전사 요약 · 실시간"
        actions={<ConnectionBadge status={badge.status} label={badge.label} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <KPITile label="총 양품" value={data.production.totalGood.toLocaleString()} unit="EA" tone="primary" />
        <KPITile label="불량 PPM" value={data.production.defectPpm.toLocaleString()} tone={ppmTone(data.production.defectPpm)} />
        <KPITile label="평균 OEE" value={data.oee.fleetOeePct.toLocaleString()} unit="%" tone={oeeTone(data.oee.fleetOeePct)} />
        <KPITile label="총 재공 WIP" value={data.wip.wipQty.toLocaleString()} unit="EA" tone="info" />
        <KPITile label="가동 설비" value={onlineCount.toLocaleString()} unit={`/${totalEquipment}`} tone="info" />
        <KPITile
          label="재고 경고"
          value={data.stock.warningCount.toLocaleString()}
          unit="건"
          tone={data.stock.warningCount > 0 ? "crit" : "ok"}
        />
        <KPITile label="미완 작업지시" value={openWorkOrders.toLocaleString()} unit="건" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>라인별 설비종합효율</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-4">
            {data.oee.perEquipment.length === 0 ? (
              <div className="w-full text-center text-caption text-text-faint">설비 데이터 없음</div>
            ) : (
              data.oee.perEquipment.map((eq) => (
                <GaugeTile key={eq.code} label={`${eq.name}`} value={eq.oeePct} tone={oeeTone(eq.oeePct)} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>주요 알람 요약</CardTitle>
            <span className="ml-auto text-caption text-text-faint">활성 {data.alarms.length}</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.alarms.length === 0 && (
              <div className="text-center text-caption text-text-faint">활성 알람 없음</div>
            )}
            {data.alarms.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <StatusPill tone={a.tone}>{a.tone === "crit" ? "이상" : a.tone === "warn" ? "주의" : "정보"}</StatusPill>
                <span className="text-body-sm text-text">{a.title}</span>
                <span className="ml-auto text-caption text-text-faint">{a.createdAt.slice(0, 16).replace("T", " ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>정지사유 Pareto</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.downtimePareto.length === 0 ? (
              <div className="text-center text-caption text-text-faint">정지 이력 없음</div>
            ) : (
              data.downtimePareto.map((row) => (
                <DowntimeParetoRow key={`${row.label}-${row.category}`} row={row} maxDowntimeMin={maxDowntimeMin} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>작업장별 WIP</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.wip.byWorkCenter.length === 0 ? (
              <div className="text-center text-caption text-text-faint">작업장 데이터 없음</div>
            ) : (
              data.wip.byWorkCenter.map((row) => (
                <WipWorkCenterRow key={row.code} row={row} maxWipQty={maxWipQty} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function ExecClient({ initial }: { initial: ExecSummary }) {
  return <ExecInner initial={initial} />;
}
