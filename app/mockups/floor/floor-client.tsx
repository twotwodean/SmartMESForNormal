"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { SectionHeader } from "@/components/ui/section-header";
import { ConnectionBadge, type ConnectionStatus } from "@/components/ui/connection-badge";
import { useLiveEquipment, type LiveStatus } from "@/components/app/use-live-equipment";
import { cn } from "@/lib/utils";
import type { EquipmentStateRow, RunState } from "@/lib/services/equipment-state-service";
import type { FloorLayout } from "@/lib/services/floor-service";

const LIVE_BADGE: Record<LiveStatus, { status: ConnectionStatus; label: string }> = {
  live: { status: "connected", label: "실시간" },
  connecting: { status: "reconnecting", label: "연결 중" },
  offline: { status: "disconnected", label: "오프라인" },
};

/** 상태별 SVG 색상(CSS 변수 그대로 사용 — 다크/라이트 테마 자동 반영, CSP 인라인 스타일이라 외부 리소스 없음). */
const STATE_COLOR: Record<RunState, { fill: string; stroke: string; text: string }> = {
  RUN: { fill: "var(--ok-soft)", stroke: "var(--ok)", text: "var(--ok)" },
  IDLE: { fill: "var(--warn-soft)", stroke: "var(--warn)", text: "var(--warn)" },
  STOP: { fill: "var(--neutral-soft)", stroke: "var(--neutral)", text: "var(--neutral)" },
  ALARM: { fill: "var(--crit-soft)", stroke: "var(--crit)", text: "var(--crit)" },
};
const OFFLINE_COLOR = { fill: "var(--elevated)", stroke: "var(--border)", text: "var(--faint)" };

// ── 레이아웃 치수(px, viewBox 단위와 동일) ──
const NODE_W = 208;
const NODE_H = 92;
const NODE_GAP = 14;
const ZONE_PAD = 16;
const ZONE_LABEL_H = 32;
const ZONE_GAP = 96; // 존 사이 여백(화살표 공간)
const MARGIN = 28;

interface ZoneEquipment {
  equipmentId: string;
  equipmentCode: string;
  row: EquipmentStateRow | undefined;
}

interface Zone {
  id: string;
  code: string;
  name: string;
  equipment: ZoneEquipment[];
}

function buildZones(layout: FloorLayout, rowsById: Map<string, EquipmentStateRow>): Zone[] {
  const wcOrder = [...layout.workCenters].sort((a, b) => a.order - b.order);
  return wcOrder.map((wc) => ({
    id: wc.id,
    code: wc.code,
    name: wc.name,
    equipment: layout.equipment
      .filter((eq) => eq.workCenterId === wc.id)
      .map((eq) => ({
        equipmentId: eq.equipmentId,
        equipmentCode: eq.equipmentCode,
        row: rowsById.get(eq.equipmentId),
      })),
  }));
}

function formatMetric(row: EquipmentStateRow | undefined): string {
  if (!row || !row.hasData) return "-";
  return `OEE ${Math.round(row.oee.oee * 100)}%`;
}

function EquipmentNode({ eq, x, y }: { eq: ZoneEquipment; x: number; y: number }) {
  const router = useRouter();
  const { row } = eq;
  const online = row?.online ?? false;
  const isAlarm = row?.runState === "ALARM";
  const isRunningOnline = row?.runState === "RUN" && online;
  const colors = !online ? OFFLINE_COLOR : STATE_COLOR[row?.runState ?? "STOP"];
  const stateLabel = !online ? "오프라인" : row?.runStateLabel ?? "-";

  const goTo = () => router.push("/mockups/monitoring");
  const onKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goTo();
    }
  };

  return (
    <g
      role="link"
      tabIndex={0}
      aria-label={`${eq.equipmentCode} ${stateLabel} — 실시간 모니터링으로 이동`}
      className="cursor-pointer outline-none focus-visible:opacity-80"
      onClick={goTo}
      onKeyDown={onKeyDown}
    >
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={10}
        style={{ fill: colors.fill, stroke: colors.stroke, strokeWidth: 1.5 }}
        className={isAlarm ? "animate-blink" : undefined}
      />
      <text x={x + 12} y={y + 24} style={{ fill: "var(--text)", fontWeight: 700, fontSize: 13 }}>
        {eq.equipmentCode}
      </text>
      <text x={x + 12} y={y + 44} style={{ fill: colors.text, fontWeight: 600, fontSize: 12 }}>
        {stateLabel}
      </text>
      <text x={x + 12} y={y + 66} style={{ fill: "var(--muted)", fontSize: 11 }}>
        {row?.equipmentName ?? ""}
      </text>
      <text x={x + 12} y={y + 82} style={{ fill: "var(--muted)", fontSize: 12 }} className="num">
        {formatMetric(row)}
      </text>
      {isRunningOnline && (
        <circle
          cx={x + NODE_W - 14}
          cy={y + 14}
          r={5}
          style={{ fill: "var(--ok)" }}
          className="animate-pulse-dot"
        />
      )}
    </g>
  );
}

type FlowState = "running" | "halted";

/**
 * VIS-6: zone 사이 공정 흐름 커넥터를 "컨베이어"처럼 흐르게 할지 판단한다.
 * 업스트림(왼쪽) zone의 실시간 설비 상태로부터 흐름 여부를 유도한다 — 규칙:
 *   1) zone에 설비가 없으면 → halted (흘려보낼 자재가 없음)
 *   2) zone 내 설비 중 하나라도 온라인 + ALARM → halted (안전 우선: 알람 중엔 흐름을 멈춰 이상 상태를 강조)
 *   3) 그 외 zone 내 설비 중 하나라도 온라인 + RUN → running (가동 중이므로 흐르는 것으로 표시)
 *   4) 그 외(전부 STOP/IDLE 이거나 오프라인) → halted
 */
function zoneFlowState(zone: Zone): FlowState {
  if (zone.equipment.length === 0) return "halted";
  const hasOnlineAlarm = zone.equipment.some((eq) => eq.row?.online && eq.row.runState === "ALARM");
  if (hasOnlineAlarm) return "halted";
  const hasOnlineRun = zone.equipment.some((eq) => eq.row?.online && eq.row.runState === "RUN");
  return hasOnlineRun ? "running" : "halted";
}

function ZoneFlowArrow({ x1, x2, y, flowState }: { x1: number; x2: number; y: number; flowState: FlowState }) {
  const running = flowState === "running";
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      style={{
        stroke: running ? "var(--info)" : "var(--neutral)",
        strokeWidth: 3,
        strokeDasharray: "10 6",
        opacity: running ? 1 : 0.45,
      }}
      className={running ? "animate-flow" : undefined}
      markerEnd="url(#floor-arrowhead)"
    />
  );
}

const LEGEND: { label: string; fill: string; stroke: string }[] = [
  { label: "가동", fill: "var(--ok-soft)", stroke: "var(--ok)" },
  { label: "대기", fill: "var(--warn-soft)", stroke: "var(--warn)" },
  { label: "정지", fill: "var(--neutral-soft)", stroke: "var(--neutral)" },
  { label: "알람", fill: "var(--crit-soft)", stroke: "var(--crit)" },
  { label: "오프라인", fill: "var(--elevated)", stroke: "var(--border)" },
];

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-caption text-text-muted">
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm border"
            style={{ backgroundColor: item.fill, borderColor: item.stroke }}
          />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="animate-blink inline-block h-3 w-3 rounded-sm border" style={{ backgroundColor: "var(--crit-soft)", borderColor: "var(--crit)" }} />
        점멸 = 알람
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg aria-hidden width="28" height="10">
          <line
            x1="1"
            y1="5"
            x2="27"
            y2="5"
            className="animate-flow"
            style={{ stroke: "var(--info)", strokeWidth: 3, strokeDasharray: "10 6" }}
          />
        </svg>
        흐름 애니메이션 = 가동 중
      </span>
    </div>
  );
}

export function FloorClient({ initial, layout }: { initial: EquipmentStateRow[]; layout: FloorLayout }) {
  const { rows, status } = useLiveEquipment(initial);
  const badge = LIVE_BADGE[status];

  const rowsById = React.useMemo(() => new Map(rows.map((r) => [r.equipmentId, r])), [rows]);
  const zones = React.useMemo(() => buildZones(layout, rowsById), [layout, rowsById]);

  const zoneWidth = NODE_W + ZONE_PAD * 2;
  const zoneStep = zoneWidth + ZONE_GAP;
  const maxNodes = Math.max(1, ...zones.map((z) => z.equipment.length));
  const zoneContentHeight = maxNodes * NODE_H + (maxNodes - 1) * NODE_GAP;
  const zoneBoxHeight = ZONE_LABEL_H + zoneContentHeight + ZONE_PAD * 2;

  const svgWidth = MARGIN * 2 + Math.max(1, zones.length) * zoneWidth + Math.max(0, zones.length - 1) * ZONE_GAP;
  const svgHeight = MARGIN * 2 + zoneBoxHeight;
  const arrowY = MARGIN + zoneBoxHeight / 2;

  return (
    <>
      <SectionHeader
        title="라인 배치도"
        description="공정 순서 기반 설비 배치 · 실시간 상태"
        actions={<ConnectionBadge status={badge.status} label={badge.label} />}
      />
      <div className="rounded-lg border border-border bg-surface p-4">
        {zones.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-text-muted">작업장 정보가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width="100%"
              style={{ maxWidth: "100%", minWidth: `${Math.min(svgWidth, 640)}px`, height: "auto", display: "block" }}
              role="img"
              aria-label="라인 배치도: 공정 순서에 따른 작업장 배치와 설비 실시간 상태"
            >
              <defs>
                <marker
                  id="floor-arrowhead"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--muted)" }} />
                </marker>
              </defs>

              {zones.map((zone, i) => {
                const zx = MARGIN + i * zoneStep;
                return (
                  <g key={zone.id}>
                    <rect
                      x={zx}
                      y={MARGIN}
                      width={zoneWidth}
                      height={zoneBoxHeight}
                      rx={12}
                      style={{ fill: "var(--bg)", stroke: "var(--border)", strokeWidth: 1 }}
                    />
                    <text
                      x={zx + zoneWidth / 2}
                      y={MARGIN + 21}
                      textAnchor="middle"
                      style={{ fill: "var(--text)", fontWeight: 700, fontSize: 13 }}
                    >
                      {zone.name}
                    </text>
                    {zone.equipment.length === 0 ? (
                      <text
                        x={zx + zoneWidth / 2}
                        y={MARGIN + ZONE_LABEL_H + zoneContentHeight / 2}
                        textAnchor="middle"
                        style={{ fill: "var(--muted)", fontSize: 12 }}
                      >
                        설비 없음
                      </text>
                    ) : (
                      zone.equipment.map((eq, j) => (
                        <EquipmentNode
                          key={eq.equipmentId}
                          eq={eq}
                          x={zx + ZONE_PAD}
                          y={MARGIN + ZONE_LABEL_H + j * (NODE_H + NODE_GAP)}
                        />
                      ))
                    )}
                    {i < zones.length - 1 && (
                      <ZoneFlowArrow
                        x1={zx + zoneWidth}
                        x2={zx + zoneWidth + ZONE_GAP}
                        y={arrowY}
                        flowState={zoneFlowState(zone)}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        <Legend />
      </div>
    </>
  );
}
