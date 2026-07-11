import { prisma } from "@/lib/db";

/**
 * VIS-3: 라인 플로어맵(2D 배치도)을 위한 정적 레이아웃 서비스.
 *
 * 설계 선택(공정 순서 기반 배치):
 * - 화면에 표시되는 "위치"는 물리적 좌표가 아니라 공정 순서(process order)다.
 *   RoutingStep.seq(공정 라우팅 상의 순번)를 기준으로 작업장(WorkCenter)을
 *   왼쪽→오른쪽 컬럼(zone)으로 배치하면, 실제 자재 흐름 방향과 화면 배치가
 *   일치해 "라인 배치도"로서 의미를 가진다.
 * - 작업장 하나에 여러 RoutingStep이 걸릴 수 있으므로(예: WC-CNC1 = 절단+가공),
 *   해당 작업장의 대표 순번은 "그 작업장에 걸린 RoutingStep.seq의 최솟값"으로 정의한다.
 * - RoutingStep이 전혀 걸리지 않은 작업장(공정 흐름 정보 없음)은 순서를 알 수 없으므로
 *   맨 뒤로 보내고, 그들끼리는 code 오름차순으로 안정 정렬한다.
 * - 실시간 상태(runState/OEE 등)는 여기서 다루지 않는다 — 클라이언트가
 *   useLiveEquipment(SSE)로 받은 EquipmentStateRow를 equipmentId/equipmentCode로
 *   매칭해 이 정적 레이아웃 위에 얹는다(레이아웃과 실시간 값의 관심사 분리).
 */

export interface FloorWorkCenter {
  id: string;
  code: string;
  name: string;
  /** 공정 순서 기준 표시 순번(0부터). 왼쪽→오른쪽 배치에 그대로 사용. */
  order: number;
}

export interface FloorEquipmentRef {
  equipmentId: string;
  equipmentCode: string;
  workCenterId: string;
}

export interface FloorLayout {
  workCenters: FloorWorkCenter[];
  equipment: FloorEquipmentRef[];
}

export async function getFloorLayout(): Promise<FloorLayout> {
  const [workCenters, routingSteps, equipmentRows] = await Promise.all([
    prisma.workCenter.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    prisma.routingStep.findMany({
      where: { workCenterId: { not: null } },
      select: { workCenterId: true, seq: true },
    }),
    prisma.equipment.findMany({
      where: { workCenterId: { not: null } },
      select: { id: true, code: true, workCenterId: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const minSeqByWorkCenter = new Map<string, number>();
  for (const step of routingSteps) {
    if (!step.workCenterId) continue;
    const prev = minSeqByWorkCenter.get(step.workCenterId);
    if (prev === undefined || step.seq < prev) {
      minSeqByWorkCenter.set(step.workCenterId, step.seq);
    }
  }

  const ordered = [...workCenters].sort((a, b) => {
    const seqA = minSeqByWorkCenter.get(a.id);
    const seqB = minSeqByWorkCenter.get(b.id);
    if (seqA !== undefined && seqB !== undefined) return seqA - seqB;
    if (seqA !== undefined) return -1;
    if (seqB !== undefined) return 1;
    return a.code.localeCompare(b.code);
  });

  // where: { workCenterId: { not: null } }로 이미 걸러졌지만 Prisma의 select 타입은
  // 여전히 string | null이므로, non-null 단언 없이 타입가드로 좁힌다.
  const hasWorkCenter = (
    eq: (typeof equipmentRows)[number],
  ): eq is (typeof equipmentRows)[number] & { workCenterId: string } => eq.workCenterId !== null;

  return {
    workCenters: ordered.map((wc, index) => ({ id: wc.id, code: wc.code, name: wc.name, order: index })),
    equipment: equipmentRows.filter(hasWorkCenter).map((eq) => ({
      equipmentId: eq.id,
      equipmentCode: eq.code,
      workCenterId: eq.workCenterId,
    })),
  };
}
