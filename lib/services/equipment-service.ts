import { prisma } from "@/lib/db";
import { mttr, mtbf } from "@/lib/domain/maintenance";
import type { MaintenanceType, MaintenanceStatus } from "@/lib/domain/types";

export type EquipmentStatus = "RUN" | "REPAIR";

export interface EquipmentRow {
  id: string;
  code: string;
  name: string;
  center: string;
  status: EquipmentStatus;
}

export async function listEquipment(): Promise<EquipmentRow[]> {
  const eqs = await prisma.equipment.findMany({
    include: { workCenter: true, maintenanceOrders: { where: { status: { in: ["REQUESTED", "IN_PROGRESS"] } } } },
    orderBy: { code: "asc" },
  });
  return eqs.map((e) => ({
    id: e.id, code: e.code, name: e.name, center: e.workCenter?.name ?? "—",
    status: e.maintenanceOrders.length > 0 ? "REPAIR" : "RUN",
  }));
}

export interface MaintenanceOrderRow {
  id: string;
  equipmentName: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  repairMin: number | null;
}

export async function listMaintenanceOrders(): Promise<MaintenanceOrderRow[]> {
  const rows = await prisma.maintenanceOrder.findMany({ include: { equipment: true }, orderBy: { requestedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, equipmentName: r.equipment.name, type: r.type as MaintenanceType, status: r.status as MaintenanceStatus,
    description: r.description, requestedAt: r.requestedAt.toISOString(),
    startedAt: r.startedAt?.toISOString() ?? null, finishedAt: r.finishedAt?.toISOString() ?? null,
    repairMin: r.startedAt && r.finishedAt ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 60000) : null,
  }));
}

export interface MaintenanceSummary {
  mttrMin: number;      // 평균 수리시간(분)
  mtbfMin: number;      // 평균 고장간격(분, 최근 30일 기준)
  repairCount: number;  // 완료 수리 건수
  openCount: number;    // 미완료(REQUESTED/IN_PROGRESS)
}

export async function maintenanceSummary(): Promise<MaintenanceSummary> {
  const all = await prisma.maintenanceOrder.findMany({ where: { type: "REPAIR" } });
  const spans = all.map((o) => ({
    startedAt: o.startedAt ? o.startedAt.getTime() : null,
    finishedAt: o.finishedAt ? o.finishedAt.getTime() : null,
  }));
  const finished = all.filter((o) => o.finishedAt);
  const open = all.filter((o) => o.status === "REQUESTED" || o.status === "IN_PROGRESS");
  // MTTR: 분 단위 span으로 계산
  const mttrSpans = spans.map((s) => ({
    startedAt: s.startedAt !== null ? Math.round(s.startedAt / 60000) : null,
    finishedAt: s.finishedAt !== null ? Math.round(s.finishedAt / 60000) : null,
  }));
  const periodMin = 30 * 24 * 60; // 최근 30일
  return {
    mttrMin: mttr(mttrSpans),
    mtbfMin: mtbf(finished.length, periodMin),
    repairCount: finished.length,
    openCount: open.length,
  };
}

export interface ScheduleRow {
  id: string;
  equipmentName: string;
  intervalDays: number;
  nextDate: string;
}
export async function listSchedules(): Promise<ScheduleRow[]> {
  const rows = await prisma.maintenanceSchedule.findMany({ include: { equipment: true }, orderBy: { nextDate: "asc" } });
  return rows.map((r) => ({ id: r.id, equipmentName: r.equipment.name, intervalDays: r.intervalDays, nextDate: r.nextDate.toISOString() }));
}

export async function createMaintenanceOrder(input: { equipmentId: string; type: MaintenanceType; description?: string }) {
  return prisma.maintenanceOrder.create({ data: { equipmentId: input.equipmentId, type: input.type, description: input.description, status: "REQUESTED" } });
}

export async function advanceMaintenance(id: string, action: "start" | "finish") {
  if (action === "start") return prisma.maintenanceOrder.update({ where: { id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
  return prisma.maintenanceOrder.update({ where: { id }, data: { status: "DONE", finishedAt: new Date() } });
}

export async function listEquipmentBrief() {
  return prisma.equipment.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } });
}
