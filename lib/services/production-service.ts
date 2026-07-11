import { prisma } from "@/lib/db";

export interface RegisterResultInput {
  workOrderId: string;
  goodQty: number;
  defectQty?: number;
  downtimeMin?: number;
}

/**
 * 생산실적 등록(원자적): ProductionResult 생성 + 양품만큼 재고 PRODUCE + WO WAITING→RUNNING
 */
export async function registerResult(input: RegisterResultInput) {
  const { workOrderId, goodQty } = input;
  const defectQty = input.defectQty ?? 0;
  const downtimeMin = input.downtimeMin ?? 0;
  if (goodQty < 0 || defectQty < 0) throw new Error("수량은 음수일 수 없습니다.");

  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) throw new Error("작업지시를 찾을 수 없습니다.");

    const result = await tx.productionResult.create({
      data: { workOrderId, goodQty, defectQty, downtimeMin },
    });

    if (goodQty > 0) {
      await tx.inventoryTxn.create({
        data: { itemId: wo.itemId, qty: goodQty, type: "PRODUCE", ref: wo.code },
      });
    }

    const updated = wo.status === "WAITING"
      ? await tx.workOrder.update({ where: { id: workOrderId }, data: { status: "RUNNING" } })
      : wo;

    return { result, workOrder: updated };
  });
}

export interface RecordPlcProductionInput {
  equipmentCode: string;
  goodQty: number;
  defectQty: number;
}

export interface RecordPlcProductionResult {
  created: boolean;
  workOrderCode?: string;
}

/**
 * PLC-4: 설비 카운터 델타를 그 설비 작업장(workCenter)의 활성(RUNNING) 작업지시에 귀속시킨다.
 * `registerResult`와 달리 재고 트랜잭션/WO 상태 전환 등 부수효과가 없는 "기계 계수 실적"만 남긴다
 * (자동 집계일 뿐 실제 검수/입고 처리는 별도 프로세스가 담당).
 * 해당 작업장에 RUNNING 상태 작업지시가 없으면 아무것도 기록하지 않고 { created:false }를 반환한다
 * (호출부인 폴러가 델타를 계속 누적 보관하다가, 다음 flush 때 재시도한다).
 */
export async function recordPlcProduction(
  input: RecordPlcProductionInput
): Promise<RecordPlcProductionResult> {
  const { equipmentCode, goodQty, defectQty } = input;

  const equipment = await prisma.equipment.findUnique({ where: { code: equipmentCode } });
  if (!equipment || !equipment.workCenterId) return { created: false };

  const workOrder = await prisma.workOrder.findFirst({
    where: { workCenterId: equipment.workCenterId, status: "RUNNING" },
    orderBy: { createdAt: "asc" },
  });
  if (!workOrder) return { created: false };

  if (goodQty + defectQty <= 0) return { created: false };

  await prisma.productionResult.create({
    data: { workOrderId: workOrder.id, goodQty, defectQty },
  });

  return { created: true, workOrderCode: workOrder.code };
}
