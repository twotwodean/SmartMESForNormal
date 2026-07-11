import { prisma } from "@/lib/db";

/**
 * PLC-3: 설비 실시간 상태(EquipmentState) 조회 서비스.
 *
 * 참고: DB의 EquipmentState.runState / stopReason은 폴러(lib/plc/poller.ts)가
 * 수집 시점에 이미 datamap의 RUN_STATE/STOP_REASON 코드표로 변환해 저장한 값이다
 * (runState는 "STOP"|"RUN"|"IDLE"|"ALARM" 영문 enum, stopReason은 이미 한글 라벨
 * 문자열 또는 null). 따라서 여기서는 코드→라벨 재변환이 아니라, 화면 표시용 한글
 * runState 라벨만 별도로 매핑한다.
 */

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
}

/** 설비(Equipment) 전체를 대상으로 최신 PLC 수집 상태(EquipmentState)를 병합해 반환한다. */
export async function listEquipmentStates(): Promise<EquipmentStateRow[]> {
  const equipment = await prisma.equipment.findMany({
    include: { workCenter: true, state: true },
    orderBy: { code: "asc" },
  });

  return equipment.map((eq) => {
    const workCenterName = eq.workCenter?.name ?? null;
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
      online: s.online,
      updatedAt: s.updatedAt.toISOString(),
      hasData: true,
    };
  });
}
