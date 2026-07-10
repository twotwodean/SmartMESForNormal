import { prisma } from "@/lib/db";
import { listStock } from "@/lib/services/inventory-service";
import { qualitySummary } from "@/lib/services/quality-service";
import { maintenanceSummary } from "@/lib/services/equipment-service";
import { listAlarms, type AlarmRow } from "@/lib/services/alarm-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

export type { AlarmRow };

export interface DashboardData {
  workOrders: { total: number; byStatus: Record<WorkOrderStatus, number> };
  stockWarnings: { code: string; name: string; qty: number; safety: number; status: string }[];
  quality: { overallPpm: number };
  equipment: { mttrMin: number; openMaintenance: number };
  alarms: AlarmRow[];
}

export async function getDashboard(): Promise<DashboardData> {
  const [wos, stock, quality, maintenance, alarms] = await Promise.all([
    prisma.workOrder.findMany({ select: { status: true } }),
    listStock(),
    qualitySummary(),
    maintenanceSummary(),
    listAlarms(),
  ]);
  const byStatus: Record<WorkOrderStatus, number> = { WAITING: 0, RUNNING: 0, DONE: 0, CANCELLED: 0 };
  for (const w of wos) byStatus[w.status as WorkOrderStatus] = (byStatus[w.status as WorkOrderStatus] ?? 0) + 1;
  const stockWarnings = stock.filter((s) => s.status !== "NORMAL").map((s) => ({ code: s.code, name: s.name, qty: s.qty, safety: s.safety, status: s.status }));
  return {
    workOrders: { total: wos.length, byStatus },
    stockWarnings,
    quality: { overallPpm: quality.overallPpm },
    equipment: { mttrMin: maintenance.mttrMin, openMaintenance: maintenance.openCount },
    alarms,
  };
}
