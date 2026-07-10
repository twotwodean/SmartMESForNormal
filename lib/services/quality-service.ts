import { prisma } from "@/lib/db";
import { ppm } from "@/lib/domain/quality";
import type { InspectionType, InspectionResult } from "@/lib/domain/types";

export interface InspectionRow {
  id: string;
  type: InspectionType;
  result: InspectionResult;
  itemName: string;
  qty: number;
  defectQty: number;
  ppm: number;
  inspectedAt: string;
}

export async function listInspections(): Promise<InspectionRow[]> {
  const rows = await prisma.inspection.findMany({ include: { item: true }, orderBy: { inspectedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, type: r.type as InspectionType, result: r.result as InspectionResult,
    itemName: r.item.name, qty: r.qty, defectQty: r.defectQty, ppm: ppm(r.defectQty, r.qty),
    inspectedAt: r.inspectedAt.toISOString(),
  }));
}

export interface QualitySummary {
  totalQty: number;
  totalDefect: number;
  overallPpm: number;
  byType: { type: InspectionType; qty: number; defect: number; ppm: number }[];
}

export async function qualitySummary(): Promise<QualitySummary> {
  const rows = await prisma.inspection.findMany();
  const totalQty = rows.reduce((a, b) => a + b.qty, 0);
  const totalDefect = rows.reduce((a, b) => a + b.defectQty, 0);
  const types: InspectionType[] = ["RECEIVING", "PROCESS", "SHIPPING"];
  const byType = types.map((type) => {
    const t = rows.filter((r) => r.type === type);
    const qty = t.reduce((a, b) => a + b.qty, 0);
    const defect = t.reduce((a, b) => a + b.defectQty, 0);
    return { type, qty, defect, ppm: ppm(defect, qty) };
  });
  return { totalQty, totalDefect, overallPpm: ppm(totalDefect, totalQty), byType };
}

export interface NonconformanceRow {
  id: string;
  defectLabel: string;
  qty: number;
  action: string | null;
  status: string;
  createdAt: string;
}

export async function listNonconformances(): Promise<NonconformanceRow[]> {
  const rows = await prisma.nonconformance.findMany({ include: { defectCode: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, defectLabel: r.defectCode?.label ?? "—", qty: r.qty, action: r.action, status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export interface CreateInspectionInput {
  type: InspectionType;
  result: InspectionResult;
  itemId: string;
  qty: number;
  defectQty: number;
}
export async function createInspection(input: CreateInspectionInput) {
  if (input.qty < 0 || input.defectQty < 0) throw new Error("수량은 음수일 수 없습니다.");
  return prisma.inspection.create({ data: input });
}

export async function listItemsBrief() {
  return prisma.item.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: "asc" } });
}
