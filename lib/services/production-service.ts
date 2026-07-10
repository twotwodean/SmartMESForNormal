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
