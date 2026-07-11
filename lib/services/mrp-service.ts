import { prisma } from "@/lib/db";
import { grossDemand, netRequirement } from "@/lib/domain/mrp";
import type { BomLink } from "@/lib/domain/bom";
import { listStock } from "@/lib/services/inventory-service";

export type MrpSuggestion = "PURCHASE" | "PRODUCE" | "NONE";

export interface MrpRow {
  itemId: string;
  code: string;
  name: string;
  uom: string;
  gross: number;
  onHand: number;
  safety: number;
  incoming: number;
  net: number;
  suggestion: MrpSuggestion;
}

/** 수주(미완료) + BOM전개 = 수요, 현재고 + 미입고 PO = 공급, 안전재고 반영 → 품목별 순소요 */
export async function computeMrp(): Promise<MrpRow[]> {
  const [items, bomRows, openSo, openPo, stock] = await Promise.all([
    prisma.item.findMany({ orderBy: { code: "asc" } }),
    prisma.bomComponent.findMany(),
    prisma.salesOrder.findMany({ where: { status: { in: ["ORDERED", "PRODUCING"] } }, select: { itemId: true, qty: true } }),
    prisma.purchaseOrder.findMany({ where: { status: { in: ["ORDERED", "PARTIAL"] } }, include: { receipts: true } }),
    listStock(),
  ]);

  const bom: BomLink[] = bomRows.map((b) => ({ parentId: b.parentId, childId: b.childId, qtyPer: b.qtyPer }));
  const gross = grossDemand(openSo, bom);
  const onHandMap = new Map(stock.map((s) => [s.itemId, s.qty]));
  const incomingMap = new Map<string, number>();
  for (const po of openPo) {
    const received = po.receipts.reduce((a, r) => a + r.qty, 0);
    incomingMap.set(po.itemId, (incomingMap.get(po.itemId) ?? 0) + Math.max(0, po.qty - received));
  }
  const madeIds = new Set(bomRows.map((b) => b.parentId)); // BOM 부모 = 사내 생산 품목

  return items.map((it) => {
    const g = gross.get(it.id) ?? 0;
    const onHand = onHandMap.get(it.id) ?? 0;
    const incoming = incomingMap.get(it.id) ?? 0;
    const net = netRequirement(g, onHand, it.safetyStock, incoming);
    const suggestion: MrpSuggestion = net <= 0 ? "NONE" : madeIds.has(it.id) ? "PRODUCE" : "PURCHASE";
    return { itemId: it.id, code: it.code, name: it.name, uom: it.uom, gross: g, onHand, safety: it.safetyStock, incoming, net, suggestion };
  });
}
