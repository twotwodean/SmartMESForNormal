import { prisma } from "@/lib/db";
import type { ConcessionStatus } from "@/lib/domain/types";

export interface ConcessionRow {
  id: string;
  itemName: string;
  qty: number;
  reason: string;
  status: ConcessionStatus;
  requestedAt: string;
  decidedAt: string | null;
}

export async function listConcessions(): Promise<ConcessionRow[]> {
  const rows = await prisma.concession.findMany({ include: { item: true }, orderBy: { requestedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, itemName: r.item.name, qty: r.qty, reason: r.reason,
    status: r.status as ConcessionStatus,
    requestedAt: r.requestedAt.toISOString(),
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
  }));
}

export async function createConcession(input: { itemId: string; qty: number; reason: string }) {
  if (input.qty <= 0) throw new Error("수량은 1 이상이어야 합니다.");
  if (!input.reason.trim()) throw new Error("사유를 입력하세요.");
  return prisma.concession.create({ data: { itemId: input.itemId, qty: input.qty, reason: input.reason, status: "REQUESTED" } });
}

/** 승인/반려: REQUESTED 상태에서만 결정, decidedAt 기록 */
export async function decideConcession(id: string, approve: boolean) {
  const c = await prisma.concession.findUnique({ where: { id } });
  if (!c) throw new Error("특채 요청을 찾을 수 없습니다.");
  if (c.status !== "REQUESTED") throw new Error("이미 처리된 요청입니다.");
  return prisma.concession.update({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date() },
  });
}
