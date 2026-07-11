// PdM-1: 예지/시간기반 보전 트리거 서비스.
// - evaluateAndTrigger: PLC 리딩을 임계 규칙과 비교해 PREDICTIVE 정비지시+알람을 자동 생성한다(중복방지).
// - checkDuePreventive: 만기 도래한 MaintenanceSchedule에 대해 PREVENTIVE 정비지시를 자동 생성하고 nextDate를 갱신한다.
import { prisma } from "@/lib/db";
import { evaluateRules, type RuleDef, type RuleReading } from "@/lib/domain/maintenance-rule";

function toRuleDef(row: {
  id: string;
  equipmentId: string | null;
  signal: string;
  op: string;
  threshold: number;
  severity: string;
  active: boolean;
  description: string | null;
}): RuleDef {
  const op = row.op === "GTE" || row.op === "LT" || row.op === "LTE" ? row.op : "GT";
  const severity = row.severity === "crit" ? "crit" : "warn";
  return {
    id: row.id,
    equipmentId: row.equipmentId,
    signal: row.signal,
    op,
    threshold: row.threshold,
    severity,
    active: row.active,
    description: row.description,
  };
}

/** 향후 규칙 관리 UI(PdM-2)를 위한 조회. */
export async function listRules(): Promise<RuleDef[]> {
  const rows = await prisma.maintenanceRule.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRuleDef);
}

export interface EvaluateAndTriggerResult {
  created: string[]; // 생성된 예지보전 지시의 signal 목록
}

/** 설비코드+리딩을 전역/설비별 활성 규칙과 비교해 위반 시 PREDICTIVE 지시+알람을 생성한다(open 지시 있으면 중복생성 skip). */
export async function evaluateAndTrigger(
  equipmentCode: string,
  reading: RuleReading,
): Promise<EvaluateAndTriggerResult> {
  const equipment = await prisma.equipment.findUnique({ where: { code: equipmentCode } });
  if (!equipment) return { created: [] };

  const ruleRows = await prisma.maintenanceRule.findMany({
    where: { active: true, OR: [{ equipmentId: equipment.id }, { equipmentId: null }] },
  });
  const rules = ruleRows.map(toRuleDef);
  const breaches = evaluateRules(reading, rules);

  const created: string[] = [];
  for (const breach of breaches) {
    const source = `PLC:${breach.signal}`;
    const openExisting = await prisma.maintenanceOrder.findFirst({
      where: {
        equipmentId: equipment.id,
        source,
        status: { in: ["REQUESTED", "IN_PROGRESS"] },
      },
    });
    if (openExisting) continue;

    await prisma.maintenanceOrder.create({
      data: {
        equipmentId: equipment.id,
        type: "PREDICTIVE",
        status: "REQUESTED",
        source,
        description: breach.message,
      },
    });
    await prisma.alarm.create({
      data: {
        tone: breach.severity === "crit" ? "crit" : "warn",
        title: `${equipmentCode} 예지보전 경보`,
        message: breach.message,
      },
    });
    created.push(breach.signal);
  }

  return { created };
}

export interface CheckDuePreventiveResult {
  created: number;
}

/** nextDate가 도래한 정비 스케줄에 대해 PREVENTIVE 지시를 자동생성하고 다음 주기로 nextDate를 전진시킨다. */
export async function checkDuePreventive(now: Date): Promise<CheckDuePreventiveResult> {
  const dueSchedules = await prisma.maintenanceSchedule.findMany({
    where: { nextDate: { lte: now } },
  });

  let created = 0;
  for (const schedule of dueSchedules) {
    const openExisting = await prisma.maintenanceOrder.findFirst({
      where: {
        equipmentId: schedule.equipmentId,
        type: "PREVENTIVE",
        status: { in: ["REQUESTED", "IN_PROGRESS"] },
      },
    });

    if (!openExisting) {
      await prisma.maintenanceOrder.create({
        data: {
          equipmentId: schedule.equipmentId,
          type: "PREVENTIVE",
          status: "REQUESTED",
          source: "SCHEDULE",
          description: `정기 예방정비(주기 ${schedule.intervalDays}일)`,
        },
      });
      created += 1;
    }

    const nextDate = new Date(schedule.nextDate);
    nextDate.setDate(nextDate.getDate() + schedule.intervalDays);
    await prisma.maintenanceSchedule.update({
      where: { id: schedule.id },
      data: { nextDate },
    });
  }

  return { created };
}
