import { prisma } from "@/lib/db";
import { oee, type OeeResult } from "@/lib/domain/oee";

/**
 * PLC-3: 설비 실시간 상태(EquipmentState) 조회 서비스.
 *
 * 참고: DB의 EquipmentState.runState / stopReason은 폴러(lib/plc/poller.ts)가
 * 수집 시점에 이미 datamap의 RUN_STATE/STOP_REASON 코드표로 변환해 저장한 값이다
 * (runState는 "STOP"|"RUN"|"IDLE"|"ALARM" 영문 enum, stopReason은 이미 한글 라벨
 * 문자열 또는 null). 따라서 여기서는 코드→라벨 재변환이 아니라, 화면 표시용 한글
 * runState 라벨만 별도로 매핑한다.
 *
 * PLC-5: 실시간 OEE — EquipmentState.runSecs/downSecs(폴러가 누적)를 가동시간 분모로,
 * 설비의 작업장(WorkCenter)에 걸린 RoutingStep.stdTimeMin을 이상 사이클타임으로 사용해
 * lib/domain/oee.ts의 oee()를 그대로 재사용한다(재구현하지 않음).
 */

/** 이상 사이클타임(분) 데이터가 전혀 없을 때의 안전한 대체값 */
const FALLBACK_IDEAL_CYCLE_MIN = 1;

/**
 * 작업장(workCenterId)별 대표 이상 사이클타임(분)을 계산한다.
 * 기준: 해당 작업장에 걸린 RoutingStep 중 stdTimeMin > 0인 값의 최솟값.
 * 없으면 FALLBACK_IDEAL_CYCLE_MIN.
 */
async function loadIdealCycleByWorkCenter(workCenterIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(workCenterIds)];
  const result = new Map<string, number>();
  if (ids.length === 0) return result;

  const steps = await prisma.routingStep.findMany({
    where: { workCenterId: { in: ids }, stdTimeMin: { gt: 0 } },
    select: { workCenterId: true, stdTimeMin: true },
  });

  for (const step of steps) {
    if (!step.workCenterId) continue;
    const prev = result.get(step.workCenterId);
    if (prev === undefined || step.stdTimeMin < prev) {
      result.set(step.workCenterId, step.stdTimeMin);
    }
  }
  return result;
}

/** 0..1 범위로 클램프(표시 안전용 — PLC 카운트가 이상치 대비 과속/과다일 때 성능·OEE가 100%를 넘는 것을 방지) */
function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function computeOee(params: {
  runSecs: number;
  downSecs: number;
  goodCount: number;
  defectCount: number;
  idealCycleMin: number;
}): OeeResult {
  const { runSecs, downSecs, goodCount, defectCount, idealCycleMin } = params;
  if (runSecs + downSecs <= 0) {
    return { availability: 0, performance: 0, quality: 0, oee: 0 };
  }
  const raw = oee({
    plannedMin: (runSecs + downSecs) / 60,
    downtimeMin: downSecs / 60,
    idealCycleMin,
    totalCount: goodCount + defectCount,
    goodCount,
  });
  // 표시 안전을 위해 각 구성요소를 0..1로 클램프한다(PLC 카운트가 이상치 대비 과속일 때
  // performance가 1을 초과할 수 있음). 종합 OEE는 raw.oee를 그대로 클램프하지 않고
  // "클램프된 구성요소들의 곱"으로 재계산해, 화면에 보이는 a×p×q와 oee 값이 항상
  // 일치하도록 한다(그렇지 않으면 예: a=0.85,p=1.00,q=0.98인데 oee=1.00처럼 안 맞아 보임).
  const availability = clamp01(raw.availability);
  const performance = clamp01(raw.performance);
  const quality = clamp01(raw.quality);
  return { availability, performance, quality, oee: clamp01(availability * performance * quality) };
}

export type RunState = "STOP" | "RUN" | "IDLE" | "ALARM";

const RUN_STATE_LABEL: Record<RunState, string> = {
  STOP: "정지",
  RUN: "가동",
  IDLE: "대기",
  ALARM: "알람",
};

function isRunState(value: string): value is RunState {
  return value === "STOP" || value === "RUN" || value === "IDLE" || value === "ALARM";
}

export interface EquipmentStateRow {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  workCenterName: string | null;
  runState: RunState;
  runStateLabel: string;
  stopReason: string | null;
  goodCount: number;
  defectCount: number;
  cycleTime: number;
  temperature: number | null;
  pressure: number | null;
  spindleRpm: number | null;
  loadPct: number | null;
  online: boolean;
  updatedAt: string | null;
  hasData: boolean;
  runSecs: number;
  downSecs: number;
  oee: OeeResult;
}

/** 설비(Equipment) 전체를 대상으로 최신 PLC 수집 상태(EquipmentState)를 병합해 반환한다. */
export async function listEquipmentStates(): Promise<EquipmentStateRow[]> {
  const equipment = await prisma.equipment.findMany({
    include: { workCenter: true, state: true },
    orderBy: { code: "asc" },
  });

  // 작업장별 이상 사이클타임을 한 번만 조회해 캐싱한다(N+1 방지).
  const workCenterIds = equipment.map((eq) => eq.workCenterId).filter((id): id is string => id !== null);
  const idealCycleByWorkCenter = await loadIdealCycleByWorkCenter(workCenterIds);

  return equipment.map((eq) => {
    const workCenterName = eq.workCenter?.name ?? null;
    const idealCycleMin = eq.workCenterId
      ? idealCycleByWorkCenter.get(eq.workCenterId) ?? FALLBACK_IDEAL_CYCLE_MIN
      : FALLBACK_IDEAL_CYCLE_MIN;
    const s = eq.state;

    if (!s) {
      return {
        equipmentId: eq.id,
        equipmentCode: eq.code,
        equipmentName: eq.name,
        workCenterName,
        runState: "STOP",
        runStateLabel: RUN_STATE_LABEL.STOP,
        stopReason: null,
        goodCount: 0,
        defectCount: 0,
        cycleTime: 0,
        temperature: null,
        pressure: null,
        spindleRpm: null,
        loadPct: null,
        online: false,
        updatedAt: null,
        hasData: false,
        runSecs: 0,
        downSecs: 0,
        oee: { availability: 0, performance: 0, quality: 0, oee: 0 },
      };
    }

    const runState: RunState = isRunState(s.runState) ? s.runState : "STOP";

    return {
      equipmentId: eq.id,
      equipmentCode: eq.code,
      equipmentName: eq.name,
      workCenterName,
      runState,
      runStateLabel: RUN_STATE_LABEL[runState],
      stopReason: s.stopReason ?? null,
      goodCount: s.goodCount,
      defectCount: s.defectCount,
      cycleTime: s.cycleTime,
      temperature: s.temperature ?? null,
      pressure: s.pressure ?? null,
      spindleRpm: s.spindleRpm ?? null,
      loadPct: s.loadPct ?? null,
      runSecs: s.runSecs,
      downSecs: s.downSecs,
      oee: computeOee({
        runSecs: s.runSecs,
        downSecs: s.downSecs,
        goodCount: s.goodCount,
        defectCount: s.defectCount,
        idealCycleMin,
      }),
      online: s.online,
      updatedAt: s.updatedAt.toISOString(),
      hasData: true,
    };
  });
}
