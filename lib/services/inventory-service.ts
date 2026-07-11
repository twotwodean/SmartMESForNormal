import { prisma } from "@/lib/db";
import { deriveStock } from "@/lib/domain/stock";
import { paginated, type PageParams, type Paginated } from "@/lib/api/pagination";
import type { Prisma } from "@prisma/client";
import type { StockStatus, InventoryTxnType } from "@/lib/domain/types";

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

/** 품목 수불 이력(최신순, 전체) — 내부 로직/테스트용. 화면 표시는 listTxnsPaged 사용. */
export async function listTxns(itemId: string) {
  return prisma.inventoryTxn.findMany({ where: { itemId }, orderBy: { createdAt: "desc" } });
}

export interface TxnRow {
  id: string;
  itemId: string;
  lotId: string | null;
  type: string;
  qty: number;
  ref: string | null;
  createdAt: string;
}

export interface ListTxnsParams extends PageParams {
  itemId: string;
}

/** 품목 수불 이력(페이지네이션) — 참조(ref)/유형(type) 검색 */
export async function listTxnsPaged(params: ListTxnsParams): Promise<Paginated<TxnRow>> {
  const { itemId, page, pageSize, search } = params;
  const where: Prisma.InventoryTxnWhereInput = {
    itemId,
    ...(search
      ? {
          OR: [
            { ref: { contains: search, mode: "insensitive" } },
            { type: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.inventoryTxn.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryTxn.count({ where }),
  ]);

  const mapped: TxnRow[] = rows.map((t) => ({
    id: t.id,
    itemId: t.itemId,
    lotId: t.lotId,
    type: t.type,
    qty: t.qty,
    ref: t.ref,
    createdAt: t.createdAt.toISOString(),
  }));
  return paginated(mapped, total, { page, pageSize, search });
}

export interface CreateTxnInput {
  itemId: string;
  type: InventoryTxnType; // IN|OUT|MOVE|ADJUST|PRODUCE|CONSUME
  qty: number;            // 부호 포함(입고/생산 +, 출고/소비 -). ADJUST는 그대로.
  ref?: string;
}
export async function createTxn(input: CreateTxnInput) {
  return prisma.inventoryTxn.create({ data: { itemId: input.itemId, type: input.type, qty: input.qty, ref: input.ref } });
}
