import { prisma } from "@/lib/db";
import { ppm } from "@/lib/domain/quality";
import { getDashboard, type DashboardData } from "@/lib/services/dashboard-service";
import { listEquipmentStates } from "@/lib/services/equipment-state-service";
import { getWipBoard } from "@/lib/services/wip-service";

/**
 * 경영 현황(Executive Dashboard) 실데이터 집계 서비스.
 *
 * 기존 서비스(dashboard-service/equipment-state-service/wip-service)를 재사용해
 * 전사 KPI + 라인별 OEE + 정지사유 Pareto + WIP + 알람을 하나의 스냅샷으로 합친다.
 * SSE(app/api/exec/stream)에서 주기적으로 이 함수를 호출해 실시간 갱신한다.
 */

export interface ExecProduction {
  totalGood: number;
  totalDefect: number;
  /** 불량 PPM = ppm(totalDefect, totalGood+totalDefect) */
  defectPpm: number;
}

export interface ExecEquipmentOee {
  code: string;
  name: string;
  oeePct: number;
  availabilityPct: number;
  online: boolean;
  runStateLabel: string;
}

export interface ExecOee {
  perEquipment: ExecEquipmentOee[];
  /** 전사 평균 OEE(%). PLC 데이터가 한 번이라도 수집된 설비만 평균에 포함(아래 설명 참고) */
  fleetOeePct: number;
}

export interface ExecWipByWorkCenter {
  code: string;
  name: string;
  wipQty: number;
}

export interface ExecWip {
  waiting: number;
  running: number;
  wipQty: number;
  byWorkCenter: ExecWipByWorkCenter[];
}

export interface ExecDowntimeReason {
  label: string;
  category: string;
  count: number;
  downtimeMin: number;
  /** 정지시간 기준 내림차순 누적 비율(%) — 고전적 Pareto */
  cumulativePct: number;
}

export interface ExecSummary {
  production: ExecProduction;
  oee: ExecOee;
  wip: ExecWip;
  downtimePareto: ExecDowntimeReason[];
  quality: { overallPpm: number };
  stock: { warningCount: number };
  equipment: { openMaintenance: number };
  alarms: DashboardData["alarms"];
  workOrders: DashboardData["workOrders"];
}

const UNSPECIFIED_REASON_LABEL = "미지정";
const UNSPECIFIED_REASON_CATEGORY = "UNPLANNED";

async function getProduction(): Promise<ExecProduction> {
  const agg = await prisma.productionResult.aggregate({
    _sum: { goodQty: true, defectQty: true },
  });
  const totalGood = agg._sum.goodQty ?? 0;
  const totalDefect = agg._sum.defectQty ?? 0;
  return { totalGood, totalDefect, defectPpm: ppm(totalDefect, totalGood + totalDefect) };
}

async function getOee(): Promise<ExecOee> {
  const rows = await listEquipmentStates();
  const perEquipment: ExecEquipmentOee[] = rows.map((r) => ({
    code: r.equipmentCode,
    name: r.equipmentName,
    oeePct: Math.round(r.oee.oee * 100),
    availabilityPct: Math.round(r.oee.availability * 100),
    online: r.online,
    runStateLabel: r.runStateLabel,
  }));

  // fleetOeePct 계산 기준: PLC로부터 한 번이라도 상태를 수집한 설비(hasData)만 평균에 포함한다.
  // 아직 폴러가 데이터를 수집하지 않은 설비(hasData=false, oee=0)까지 평균에 넣으면
  // "설비가 나쁘게 돌고 있다"가 아니라 "아직 연결 안 됨"이 OEE 저하로 잘못 보이므로 제외한다.
  const withData = rows.filter((r) => r.hasData);
  const fleetOeePct = withData.length === 0
    ? 0
    : Math.round((withData.reduce((sum, r) => sum + r.oee.oee, 0) / withData.length) * 100);

  return { perEquipment, fleetOeePct };
}

async function getWip(): Promise<ExecWip> {
  const board = await getWipBoard();
  return {
    waiting: board.totals.waiting,
    running: board.totals.running,
    wipQty: board.totals.wipQty,
    byWorkCenter: board.columns.map((c) => ({ code: c.workCenterCode, name: c.workCenterName, wipQty: c.wipQty })),
  };
}

interface ReasonAccum {
  label: string;
  category: string;
  count: number;
  downtimeMin: number;
}

async function getDowntimePareto(): Promise<ExecDowntimeReason[]> {
  const results = await prisma.productionResult.findMany({
    where: { downtimeMin: { gt: 0 } },
    select: { downtimeMin: true, downtimeReason: { select: { label: true, category: true } } },
  });

  const byKey = new Map<string, ReasonAccum>();
  for (const r of results) {
    const key = r.downtimeReason ? `${r.downtimeReason.label}::${r.downtimeReason.category}` : "__unspecified__";
    const label = r.downtimeReason?.label ?? UNSPECIFIED_REASON_LABEL;
    const category = r.downtimeReason?.category ?? UNSPECIFIED_REASON_CATEGORY;
    const acc = byKey.get(key);
    if (acc) {
      acc.count += 1;
      acc.downtimeMin += r.downtimeMin;
    } else {
      byKey.set(key, { label, category, count: 1, downtimeMin: r.downtimeMin });
    }
  }

  const sorted = Array.from(byKey.values()).sort((a, b) => b.downtimeMin - a.downtimeMin);
  const totalDowntimeMin = sorted.reduce((sum, r) => sum + r.downtimeMin, 0);

  let cumulative = 0;
  return sorted.map((r) => {
    cumulative += r.downtimeMin;
    const cumulativePct = totalDowntimeMin > 0 ? Math.round((cumulative / totalDowntimeMin) * 1000) / 10 : 0;
    return { label: r.label, category: r.category, count: r.count, downtimeMin: r.downtimeMin, cumulativePct };
  });
}

export async function getExecSummary(): Promise<ExecSummary> {
  const [production, oee, wip, downtimePareto, dashboard] = await Promise.all([
    getProduction(),
    getOee(),
    getWip(),
    getDowntimePareto(),
    getDashboard(),
  ]);

  return {
    production,
    oee,
    wip,
    downtimePareto,
    quality: { overallPpm: dashboard.quality.overallPpm },
    stock: { warningCount: dashboard.stockWarnings.length },
    equipment: { openMaintenance: dashboard.equipment.openMaintenance },
    alarms: dashboard.alarms,
    workOrders: dashboard.workOrders,
  };
}
