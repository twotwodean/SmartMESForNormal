import { prisma } from "@/lib/db";
import { listEquipmentStates, type RunState } from "@/lib/services/equipment-state-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

/**
 * 실시간 재공(WIP) 보드 서비스.
 *
 * 작업장(WorkCenter)별로 진행중(RUNNING)/대기(WAITING) 작업지시를 묶어 계획 대비
 * 실적(진척률)을 계산하고, 같은 작업장에 걸린 설비의 실시간 가동상태/OEE를
 * lib/services/equipment-state-service.ts(listEquipmentStates)를 재사용해 부착한다.
 */

export interface WipOrder {
  code: string;
  itemName: string;
  plannedQty: number;
  producedQty: number;
  /** 0..100, plannedQty<=0이면 0 */
  progress: number;
  status: WorkOrderStatus;
  defectQty: number;
}

export interface WipEquipment {
  code: string;
  name: string;
  runState: RunState;
  runStateLabel: string;
  online: boolean;
  /** 0..100 */
  oeePct: number;
}

export interface WipColumn {
  workCenterId: string;
  workCenterCode: string;
  workCenterName: string;
  waitingCount: number;
  runningCount: number;
  /** WAITING+RUNNING 작업지시의 잔여수량(planned-produced) 합 */
  wipQty: number;
  orders: WipOrder[];
  equipment: WipEquipment[];
}

export interface WipBoard {
  columns: WipColumn[];
  totals: { waiting: number; running: number; wipQty: number };
}

const UNASSIGNED_ID = "__unassigned__";
const UNASSIGNED_CODE = "-";
const UNASSIGNED_NAME = "미지정";

const WIP_STATUSES: WorkOrderStatus[] = ["WAITING", "RUNNING"];

interface ColumnAccum {
  workCenterId: string;
  workCenterCode: string;
  workCenterName: string;
  waitingCount: number;
  runningCount: number;
  wipQty: number;
  orders: WipOrder[];
}

export async function getWipBoard(): Promise<WipBoard> {
  const [workOrders, equipmentStates, workCenters] = await Promise.all([
    prisma.workOrder.findMany({
      where: { status: { in: WIP_STATUSES } },
      include: { item: true, workCenter: true, results: true },
    }),
    listEquipmentStates(),
    prisma.workCenter.findMany({ orderBy: { code: "asc" } }),
  ]);

  const columns = new Map<string, ColumnAccum>();

  const getColumn = (id: string, code: string, name: string): ColumnAccum => {
    let col = columns.get(id);
    if (!col) {
      col = { workCenterId: id, workCenterCode: code, workCenterName: name, waitingCount: 0, runningCount: 0, wipQty: 0, orders: [] };
      columns.set(id, col);
    }
    return col;
  };

  // 실적/재공이 전혀 없는 작업장도 빈 컬럼으로 렌더링되도록 먼저 전체 작업장을 시딩한다.
  for (const wc of workCenters) {
    getColumn(wc.id, wc.code, wc.name);
  }

  for (const wo of workOrders) {
    const producedQty = wo.results.reduce((sum, r) => sum + r.goodQty, 0);
    const defectQty = wo.results.reduce((sum, r) => sum + r.defectQty, 0);
    const progress = wo.qty > 0 ? Math.min(100, Math.round((producedQty / wo.qty) * 100)) : 0;
    const remaining = Math.max(0, wo.qty - producedQty);
    const status = wo.status as WorkOrderStatus;

    const id = wo.workCenterId ?? UNASSIGNED_ID;
    const code = wo.workCenter?.code ?? UNASSIGNED_CODE;
    const name = wo.workCenter?.name ?? UNASSIGNED_NAME;
    const col = getColumn(id, code, name);

    col.orders.push({
      code: wo.code,
      itemName: wo.item.name,
      plannedQty: wo.qty,
      producedQty,
      progress,
      status,
      defectQty,
    });
    col.wipQty += remaining;
    if (status === "WAITING") col.waitingCount += 1;
    else if (status === "RUNNING") col.runningCount += 1;
  }

  // 작업장명 → id 매핑(설비 실시간 상태는 workCenterName만 갖고 있으므로 역참조).
  const nameToId = new Map(workCenters.map((wc) => [wc.name, wc.id]));
  const equipmentByColumn = new Map<string, WipEquipment[]>();
  for (const eq of equipmentStates) {
    const id = (eq.workCenterName && nameToId.get(eq.workCenterName)) || UNASSIGNED_ID;
    const list = equipmentByColumn.get(id) ?? [];
    list.push({
      code: eq.equipmentCode,
      name: eq.equipmentName,
      runState: eq.runState,
      runStateLabel: eq.runStateLabel,
      online: eq.online,
      oeePct: Math.round(eq.oee.oee * 100),
    });
    equipmentByColumn.set(id, list);
  }

  const all = Array.from(columns.values());
  const real = all
    .filter((c) => c.workCenterId !== UNASSIGNED_ID)
    .sort((a, b) => a.workCenterCode.localeCompare(b.workCenterCode));
  const unassigned = all.find((c) => c.workCenterId === UNASSIGNED_ID && c.orders.length > 0);
  const ordered = unassigned ? [...real, unassigned] : real;

  const finalColumns: WipColumn[] = ordered.map((c) => ({
    workCenterId: c.workCenterId,
    workCenterCode: c.workCenterCode,
    workCenterName: c.workCenterName,
    waitingCount: c.waitingCount,
    runningCount: c.runningCount,
    wipQty: c.wipQty,
    orders: [...c.orders].sort((a, b) => {
      if (a.status === b.status) return a.code.localeCompare(b.code);
      return a.status === "RUNNING" ? -1 : 1;
    }),
    equipment: equipmentByColumn.get(c.workCenterId) ?? [],
  }));

  const totals = finalColumns.reduce(
    (acc, c) => ({
      waiting: acc.waiting + c.waitingCount,
      running: acc.running + c.runningCount,
      wipQty: acc.wipQty + c.wipQty,
    }),
    { waiting: 0, running: 0, wipQty: 0 },
  );

  return { columns: finalColumns, totals };
}
