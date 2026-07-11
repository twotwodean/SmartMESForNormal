"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Maximize2 } from "lucide-react";

import { Clock } from "@/components/ui/clock";
import { ConnectionBadge, type ConnectionStatus } from "@/components/ui/connection-badge";
import { useLiveEquipment, type LiveStatus } from "@/components/app/use-live-equipment";
import { cn } from "@/lib/utils";
import type { EquipmentStateRow, RunState } from "@/lib/services/equipment-state-service";

const LIVE_BADGE: Record<LiveStatus, { status: ConnectionStatus; label: string }> = {
  live: { status: "connected", label: "실시간" },
  connecting: { status: "reconnecting", label: "연결 중" },
  offline: { status: "disconnected", label: "오프라인" },
};

type LineTone = "run" | "idle" | "stop" | "alarm";

/** ISA-101 원칙: 평상시(가동/대기/정지)는 절제된 톤(soft), 이상(알람)만 강한 색+점멸로 튀게 한다. */
const LINE_TONE_STYLE: Record<LineTone, { tile: string; badgeBg: string; badgeFg: string; label: string }> = {
  run: { tile: "border-ok bg-ok-soft", badgeBg: "bg-ok", badgeFg: "text-black", label: "가동" },
  idle: { tile: "border-warn bg-warn-soft", badgeBg: "bg-warn", badgeFg: "text-black", label: "대기" },
  stop: { tile: "border-border bg-elevated", badgeBg: "bg-neutral", badgeFg: "text-white", label: "정지" },
  alarm: { tile: "border-crit bg-crit-soft animate-blink", badgeBg: "bg-crit", badgeFg: "text-white", label: "알람" },
};

const EQUIPMENT_DOT: Record<RunState, string> = {
  RUN: "bg-ok",
  IDLE: "bg-warn",
  STOP: "bg-neutral",
  ALARM: "bg-crit",
};

interface LineCounts {
  run: number;
  idle: number;
  stop: number;
  alarm: number;
}

interface AndonLine {
  key: string;
  workCenterName: string;
  equipment: EquipmentStateRow[];
  tone: LineTone;
  counts: LineCounts;
  avgOeePct: number;
}

/**
 * 라인(작업장)별 대표 상태를 정한다. app/mockups/wip/wip-client.tsx의 summarizeLineTone과
 * 그룹핑 방식(작업장 단위로 설비를 묶어 대표 상태 하나로 요약)은 동일하되, 우선순위는
 * 다르다: WIP 보드는 "지금 진행 중인지"가 관심사라 RUN을 ALARM보다 우선하지만,
 * Andon(대형 상태판)은 "이상 신호를 절대 놓치지 않는 것"이 핵심 목적이므로
 * ALARM > RUN > IDLE > STOP 순으로 알람이 항상 최우선으로 드러나게 한다.
 */
function summarizeLineTone(equipment: EquipmentStateRow[]): LineTone {
  if (equipment.some((e) => e.runState === "ALARM")) return "alarm";
  if (equipment.some((e) => e.runState === "RUN")) return "run";
  if (equipment.some((e) => e.runState === "IDLE")) return "idle";
  return "stop";
}

function countByState(equipment: EquipmentStateRow[]): LineCounts {
  const counts: LineCounts = { run: 0, idle: 0, stop: 0, alarm: 0 };
  for (const e of equipment) {
    if (e.runState === "RUN") counts.run += 1;
    else if (e.runState === "IDLE") counts.idle += 1;
    else if (e.runState === "STOP") counts.stop += 1;
    else counts.alarm += 1;
  }
  return counts;
}

function averageOeePct(equipment: EquipmentStateRow[]): number {
  const withData = equipment.filter((e) => e.hasData);
  if (withData.length === 0) return 0;
  const sum = withData.reduce((acc, e) => acc + e.oee.oee, 0);
  return Math.round((sum / withData.length) * 100);
}

function groupByLine(rows: EquipmentStateRow[]): AndonLine[] {
  const map = new Map<string, EquipmentStateRow[]>();
  for (const row of rows) {
    const key = row.workCenterName ?? "미배정 작업장";
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return [...map.entries()]
    .map(([workCenterName, equipment]) => ({
      key: workCenterName,
      workCenterName,
      equipment,
      tone: summarizeLineTone(equipment),
      counts: countByState(equipment),
      avgOeePct: averageOeePct(equipment),
    }))
    .sort((a, b) => a.workCenterName.localeCompare(b.workCenterName, "ko"));
}

function EquipmentChip({ row }: { row: EquipmentStateRow }) {
  const isAlarm = row.runState === "ALARM";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2 py-1 text-body-sm font-semibold sm:text-body",
        isAlarm && "animate-blink border-crit text-crit",
        !row.online && !isAlarm && "opacity-60",
      )}
    >
      <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", EQUIPMENT_DOT[row.runState])} />
      <span className="font-mono">{row.equipmentCode}</span>
      <span className="text-text-muted">{row.runStateLabel}</span>
    </span>
  );
}

function LineTile({ line }: { line: AndonLine }) {
  const style = LINE_TONE_STYLE[line.tone];
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col gap-3 rounded-2xl border-2 p-5 transition-colors sm:p-6",
        style.tile,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-bold leading-tight text-text sm:text-3xl">{line.workCenterName}</h2>
        <span className={cn("shrink-0 rounded-full px-4 py-1 text-xl font-extrabold sm:text-2xl", style.badgeBg, style.badgeFg)}>
          {style.label}
        </span>
      </div>

      <p className="num text-lg text-text-muted sm:text-xl">
        가동 {line.counts.run} · 대기 {line.counts.idle} · 정지 {line.counts.stop} · 알람 {line.counts.alarm}
      </p>

      <p className="num text-4xl font-black text-text sm:text-5xl">OEE {line.avgOeePct}%</p>

      {line.equipment.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-2">
          {line.equipment.map((eq) => (
            <EquipmentChip key={eq.equipmentId} row={eq} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlarmBanner({ alarms }: { alarms: EquipmentStateRow[] }) {
  if (alarms.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-ok bg-ok-soft px-6 py-4 text-ok">
        <CheckCircle2 size={32} aria-hidden />
        <span className="text-2xl font-extrabold sm:text-3xl">전체 정상 가동</span>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="animate-blink flex flex-col gap-2 rounded-xl border-2 border-crit bg-crit px-6 py-4 text-white"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={32} aria-hidden />
        <span className="text-2xl font-extrabold sm:text-3xl">알람 발생 — {alarms.length}건</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-lg font-semibold sm:text-xl">
        {alarms.map((eq) => (
          <span key={eq.equipmentId}>
            {eq.equipmentCode} · {eq.equipmentName} · {eq.workCenterName ?? "미배정 작업장"}
          </span>
        ))}
      </div>
    </div>
  );
}

function enterFullscreen() {
  document.documentElement.requestFullscreen().catch(() => {
    // 전체화면 전환 실패(사용자 제스처 요건 미충족 등)해도 화면은 그대로 유지한다.
  });
}

/**
 * Andon(대형 상태판)은 시인성이 최우선이라, 사용자의 라이트/다크 테마 선택과 무관하게
 * 항상 고대비 다크 팔레트를 강제한다. globals.css의 CSS 커스텀 프로퍼티(--bg 등)를
 * 이 서브트리 루트에서 인라인 style로 재정의해 :root[data-theme="light"]류 규칙보다
 * 우선 적용되게 한다(문서화된 의도적 선택 — 나머지 앱은 테마 토글을 그대로 따른다).
 */
const ANDON_DARK_VARS: React.CSSProperties = {
  ["--bg" as string]: "#05070A",
  ["--surface" as string]: "#0F1620",
  ["--elevated" as string]: "#161F2C",
  ["--border" as string]: "#2A3644",
  ["--text" as string]: "#F1F5F9",
  ["--muted" as string]: "#94A3B8",
  ["--faint" as string]: "#64748B",
  ["--ok" as string]: "#22C55E",
  ["--ok-soft" as string]: "#0F2A18",
  ["--warn" as string]: "#F59E0B",
  ["--warn-soft" as string]: "#2E2208",
  ["--crit" as string]: "#EF4444",
  ["--crit-soft" as string]: "#3A1212",
  ["--neutral" as string]: "#64748B",
  ["--neutral-soft" as string]: "#1B2430",
};

export function AndonClient({ initial }: { initial: EquipmentStateRow[] }) {
  const { rows, status } = useLiveEquipment(initial);
  const badge = LIVE_BADGE[status];

  const lines = React.useMemo(() => groupByLine(rows), [rows]);
  const alarms = React.useMemo(() => rows.filter((r) => r.runState === "ALARM"), [rows]);
  const totals = React.useMemo(
    () => ({ ...countByState(rows), avgOeePct: averageOeePct(rows) }),
    [rows],
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-bg text-text" style={ANDON_DARK_VARS}>
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-5 p-5 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            생산 현장 현황 <span className="text-text-muted">(Andon)</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <ConnectionBadge status={badge.status} label={badge.label} className="text-body" />
            <Clock className="text-lg sm:text-xl" />
            <button
              type="button"
              onClick={enterFullscreen}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-4 py-2 text-body font-semibold text-text hover:bg-surface"
            >
              <Maximize2 size={18} aria-hidden /> 전체화면
            </button>
          </div>
        </header>

        <AlarmBanner alarms={alarms} />

        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lines.length === 0 ? (
            <p className="col-span-full py-16 text-center text-xl text-text-muted">등록된 설비가 없습니다.</p>
          ) : (
            lines.map((line) => <LineTile key={line.key} line={line} />)
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface px-6 py-4 text-xl font-bold sm:text-2xl">
          <span className="text-ok">가동 {totals.run}</span>
          <span className="text-warn">대기 {totals.idle}</span>
          <span className="text-neutral">정지 {totals.stop}</span>
          <span className={cn("text-crit", totals.alarm > 0 && "animate-blink")}>알람 {totals.alarm}</span>
          <span className="num text-text">평균 OEE {totals.avgOeePct}%</span>
        </footer>
      </div>
    </div>
  );
}
