import { prisma } from "@/lib/db";
import { deriveStock } from "@/lib/domain/stock";
import type { StockStatus } from "@/lib/domain/types";

export interface StockRow {
  itemId: string;
  code: string;
  name: string;
  uom: string;
  qty: number;
  safety: number;
  status: StockStatus;
}

function stockStatus(qty: number, safety: number): StockStatus {
  if (qty < 0) return "NEGATIVE";
  if (qty < safety) return "BELOW";
  return "NORMAL";
}

/** 품목별 현재고(수불 파생) + 안전재고 상태 */
export async function listStock(): Promise<StockRow[]> {
  const [items, txns] = await Promise.all([
    prisma.item.findMany({ orderBy: { code: "asc" } }),
    prisma.inventoryTxn.findMany({ select: { itemId: true, qty: true } }),
  ]);
  const stock = deriveStock(txns);
  return items.map((it) => {
    const qty = stock.get(it.id) ?? 0;
    return { itemId: it.id, code: it.code, name: it.name, uom: it.uom, qty, safety: it.safetyStock, status: stockStatus(qty, it.safetyStock) };
  });
}

/** 품목 수불 이력(최신순) */
export async function listTxns(itemId: string) {
  return prisma.inventoryTxn.findMany({ where: { itemId }, orderBy: { createdAt: "desc" } });
}
