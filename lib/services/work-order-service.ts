import { prisma } from "@/lib/db";
import type { WorkOrderStatus } from "@/lib/domain/types";

export interface WorkOrderRow {
  id: string;
  code: string;
  itemName: string;
  qty: number;
  status: WorkOrderStatus;
  center: string;
}

export async function listWorkOrders(): Promise<WorkOrderRow[]> {
  const wos = await prisma.workOrder.findMany({ include: { item: true, workCenter: true }, orderBy: { createdAt: "desc" } });
  return wos.map((w) => ({
    id: w.id, code: w.code, itemName: w.item.name, qty: w.qty,
    status: w.status as WorkOrderStatus, center: w.workCenter?.name ?? "—",
  }));
}

const VALID: WorkOrderStatus[] = ["WAITING", "RUNNING", "DONE", "CANCELLED"];

export async function updateStatus(id: string, status: string) {
  if (!VALID.includes(status as WorkOrderStatus)) throw new Error(`잘못된 상태: ${status}`);
  return prisma.workOrder.update({ where: { id }, data: { status } });
}

let woSeq = 0;
export async function createWorkOrder(input: { itemId: string; qty: number; workCenterId?: string }) {
  woSeq += 1;
  const code = `WO-${Date.now().toString().slice(-6)}-${String(woSeq).padStart(3, "0")}`;
  return prisma.workOrder.create({ data: { code, itemId: input.itemId, qty: input.qty, workCenterId: input.workCenterId, status: "WAITING" } });
}
