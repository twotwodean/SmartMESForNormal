"use client";

import * as React from "react";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusPill, workOrderTone, type Tone } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ConnectionBadge, type ConnectionStatus } from "@/components/ui/connection-badge";
import { useLiveWip, type LiveStatus } from "@/components/app/use-live-wip";
import { cn } from "@/lib/utils";
import type { WipBoard, WipColumn, WipOrder, WipEquipment } from "@/lib/services/wip-service";
import type { RunState } from "@/lib/services/equipment-state-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

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

const ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기",
  RUNNING: "진행",
  DONE: "완료",
  CANCELLED: "취소",
};

/** 컬럼(작업장)의 전체적인 라인 상태를 대표 설비 상태 하나로 요약한다: RUN > ALARM > IDLE > STOP 우선순위 */
function summarizeLineTone(equipment: WipEquipment[]): { tone: Tone; label: string; isAlarm: boolean } {
  if (equipment.length === 0) return { tone: "neutral", label: "설비 없음", isAlarm: false };
  if (equipment.some((e) => e.runState === "RUN")) return { tone: "ok", label: "가동", isAlarm: false };
  if (equipment.some((e) => e.runState === "ALARM")) return { tone: "crit", label: "알람", isAlarm: true };
  if (equipment.some((e) => e.runState === "IDLE")) return { tone: "warn", label: "대기", isAlarm: false };
  return { tone: "neutral", label: "정지", isAlarm: false };
}

function EquipmentBadge({ eq }: { eq: WipEquipment }) {
  const tone = RUN_STATE_TONE[eq.runState];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-1.5 py-0.5 text-caption",
        !eq.online && "opacity-60",
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tone === "ok" ? "bg-ok" : tone === "crit" ? "bg-crit" : tone === "warn" ? "bg-warn" : "bg-neutral")} />
      <span className="font-mono">{eq.code}</span>
      <span className="text-text-muted">{eq.runStateLabel}</span>
      <span className="num font-semibold text-primary">{eq.oeePct}%</span>
    </span>
  );
}

function WipOrderCard({ order }: { order: WipOrder }) {
  const tone = workOrderTone(order.status);
  return (
    <div className="rounded-lg border border-border bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-caption text-text-muted">{order.code}</span>
        <StatusPill tone={tone}>{ORDER_STATUS_LABEL[order.status]}</StatusPill>
      </div>
      <div className="mt-1.5 text-body-sm font-medium text-text">{order.itemName}</div>
      <div className="mt-2 flex items-center gap-2">
        <ProgressBar
          value={order.progress}
          tone={tone}
          className="flex-1"
          aria-label={`진척률 ${order.progress}%`}
        />
        <span className="num shrink-0 text-caption text-text-muted">{order.progress}%</span>
      </div>
      <div className="num mt-1 flex items-center justify-between text-caption text-text-muted">
        <span>
          {order.producedQty.toLocaleString()} / {order.plannedQty.toLocaleString()} EA
        </span>
        {order.defectQty > 0 && <span className="text-crit">불량 {order.defectQty.toLocaleString()}</span>}
      </div>
    </div>
  );
}

function WipColumnCard({ column }: { column: WipColumn }) {
  const line = summarizeLineTone(column.equipment);
  const isRunning = line.label === "가동";
  return (
    <Card className={cn("flex h-full w-72 shrink-0 flex-col", line.isAlarm && "border-crit")}>
      <CardHeader className="flex-col items-stretch gap-1.5">
        <div className="flex w-full items-start justify-between gap-2">
          <div>
            <CardTitle>{column.workCenterName}</CardTitle>
            <p className="font-mono text-caption text-text-muted">{column.workCenterCode}</p>
          </div>
          <StatusPill tone={line.tone} animate={line.isAlarm ? "blink" : isRunning ? "pulse" : "none"}>
            {line.label}
          </StatusPill>
        </div>
        {column.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {column.equipment.map((eq) => (
              <EquipmentBadge key={eq.code} eq={eq} />
            ))}
          </div>
        )}
        <p className="text-caption text-text-muted">
          진행 {column.runningCount} · 대기 {column.waitingCount} · 재공 {column.wipQty.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 overflow-y-auto">
        {column.orders.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-text-muted">진행 중 작업 없음</p>
        ) : (
          column.orders.map((order) => <WipOrderCard key={order.code} order={order} />)
        )}
      </CardContent>
    </Card>
  );
}

export function WipClient({ initial }: { initial: WipBoard }) {
  const { board, status } = useLiveWip(initial);
  const badge = LIVE_BADGE[status];

  return (
    <>
      <SectionHeader
        title="실시간 재공(WIP) 보드"
        description="작업장별 진행·대기 · 라인 실시간 상태"
        actions={
          <div className="flex items-center gap-2">
            <ConnectionBadge status={badge.status} label={badge.label} />
            <span className="text-caption text-text-muted">
              총 진행 {board.totals.running} · 대기 {board.totals.waiting} · 재공수량{" "}
              {board.totals.wipQty.toLocaleString()}
            </span>
          </div>
        }
      />
      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-h-[60vh] items-stretch gap-4 px-1">
          {board.columns.map((column) => (
            <WipColumnCard key={column.workCenterId} column={column} />
          ))}
        </div>
      </div>
    </>
  );
}
