"use client";

import * as React from "react";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPITile } from "@/components/ui/kpi-tile";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { ConnectionBadge, type ConnectionStatus } from "@/components/ui/connection-badge";
import { useLiveEquipment, type LiveStatus } from "@/components/app/use-live-equipment";
import { useFlashOnChange } from "@/components/app/use-flash-on-change";
import { cn } from "@/lib/utils";
import type { EquipmentStateRow, RunState } from "@/lib/services/equipment-state-service";

const LIVE_BADGE: Record<LiveStatus, { status: ConnectionStatus; label: string }> = {
  live: { status: "connected", label: "실시간" },
  connecting: { status: "reconnecting", label: "연결 중" },
  offline: { status: "disconnected", label: "오프라인" },
};

const RUN_STATE_TONE: Record<RunState, Tone> = {
  RUN: "ok",
  STOP: "neutral",
  IDLE: "warn",
  ALARM: "crit",
};

/** ISO 타임스탬프를 "N초 전"/"N분 전" 형태로 표시한다. null이면 "-". */
function formatUpdatedAt(updatedAt: string | null): string {
  if (!updatedAt) return "-";
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000));
  if (diffSec < 60) return `최근 ${diffSec}초 전`;
  const diffMin = Math.round(diffSec / 60);
  return `최근 ${diffMin}분 전`;
}

function GaugePlaceholder({ label }: { label: string }) {
  return (
    <div className="inline-flex w-24 flex-col items-center gap-1">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border text-body text-text-muted">
        -
      </div>
      <span className="text-caption text-text-muted">{label}</span>
    </div>
  );
}

function EquipmentCard({ row }: { row: EquipmentStateRow }) {
  const tone = RUN_STATE_TONE[row.runState];
  const isAlarm = row.runState === "ALARM";
  const isRunningOnline = row.runState === "RUN" && row.online;
  const goodFlash = useFlashOnChange(row.goodCount);

  return (
    <Card className={cn("relative overflow-hidden", isAlarm && "border-crit")}>
      {isAlarm && (
        <span
          aria-hidden
          className="animate-blink absolute inset-y-0 left-0 w-1 bg-crit"
        />
      )}
      <CardHeader className="flex-col items-stretch gap-1.5">
        <div className="flex w-full items-start justify-between gap-2">
          <div>
            <CardTitle>
              {row.equipmentCode} · {row.equipmentName}
            </CardTitle>
            <p className="text-caption text-text-muted">{row.workCenterName ?? "미배정 작업장"}</p>
          </div>
          <StatusPill tone={tone} animate={isAlarm ? "blink" : isRunningOnline ? "pulse" : "none"}>
            {row.runStateLabel}
          </StatusPill>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              row.online ? "bg-ok" : "bg-neutral",
              isRunningOnline && "animate-pulse-dot",
            )}
          />
          <span>{row.online ? "온라인" : "오프라인"}</span>
          <span>· {formatUpdatedAt(row.updatedAt)}</span>
          {row.runState === "STOP" && row.stopReason && <span>· 정지사유: {row.stopReason}</span>}
        </div>
      </CardHeader>
      <CardContent>
        {!row.hasData ? (
          <p className="py-4 text-center text-body-sm text-text-muted">수집 데이터 없음 (폴러 미가동)</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <KPITile
                label="양품"
                value={row.goodCount.toLocaleString()}
                unit="ea"
                tone="ok"
                className={goodFlash ? "animate-flash" : undefined}
              />
              <KPITile
                label="불량"
                value={row.defectCount.toLocaleString()}
                unit="ea"
                tone={row.defectCount > 0 ? "crit" : "neutral"}
              />
              <KPITile label="사이클타임" value={row.cycleTime.toFixed(1)} unit="s" tone="primary" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-border pt-4">
              <GaugeTile label="OEE" value={row.oee.oee * 100} unit="%" tone="primary" size={96} />
              <div className="grid grid-cols-3 gap-3">
                <KPITile label="가동률" value={(row.oee.availability * 100).toFixed(0)} unit="%" tone="ok" />
                <KPITile label="성능" value={(row.oee.performance * 100).toFixed(0)} unit="%" tone="info" />
                <KPITile label="품질" value={(row.oee.quality * 100).toFixed(0)} unit="%" tone="warn" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {row.temperature !== null ? (
                <GaugeTile label="온도" value={row.temperature} unit="℃" tone="info" size={96} />
              ) : (
                <GaugePlaceholder label="온도" />
              )}
              {row.loadPct !== null ? (
                <GaugeTile label="부하" value={row.loadPct} unit="%" tone="warn" size={96} />
              ) : (
                <GaugePlaceholder label="부하" />
              )}
              {row.pressure !== null ? (
                <GaugeTile label="압력" value={row.pressure} unit="MPa" tone="primary" size={96} />
              ) : (
                <GaugePlaceholder label="압력" />
              )}
              <div className="inline-flex w-24 flex-col items-center justify-center gap-1">
                <span className="num text-h3 font-bold text-text">
                  {row.spindleRpm !== null ? row.spindleRpm.toLocaleString() : "-"}
                  <span className="ml-0.5 text-body font-semibold text-text-muted">rpm</span>
                </span>
                <span className="text-caption text-text-muted">스핀들</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MonitoringClient({ initial }: { initial: EquipmentStateRow[] }) {
  const { rows, status } = useLiveEquipment(initial);
  const badge = LIVE_BADGE[status];

  return (
    <>
      <SectionHeader
        title="설비 실시간 모니터링"
        description="PLC 수집 데이터 · 자동 갱신"
        actions={<ConnectionBadge status={badge.status} label={badge.label} />}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <EquipmentCard key={row.equipmentId} row={row} />
        ))}
      </div>
    </>
  );
}
