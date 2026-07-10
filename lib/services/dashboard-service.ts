import { prisma } from "@/lib/db";
import { listStock } from "@/lib/services/inventory-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

export interface DashboardData {
  workOrders: { total: number; byStatus: Record<WorkOrderStatus, number> };
  stockWarnings: { code: string; name: string; qty: number; safety: number; status: string }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const [wos, stock] = await Promise.all([prisma.workOrder.findMany({ select: { status: true } }), listStock()]);
  const byStatus: Record<WorkOrderStatus, number> = { WAITING: 0, RUNNING: 0, DONE: 0, CANCELLED: 0 };
  for (const w of wos) byStatus[w.status as WorkOrderStatus] = (byStatus[w.status as WorkOrderStatus] ?? 0) + 1;
  const stockWarnings = stock.filter((s) => s.status !== "NORMAL").map((s) => ({ code: s.code, name: s.name, qty: s.qty, safety: s.safety, status: s.status }));
  return { workOrders: { total: wos.length, byStatus }, stockWarnings };
}
