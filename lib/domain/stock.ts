export interface StockTxn {
  itemId: string;
  qty: number;
}

/** InventoryTxn 목록 → 품목별 현재고(파생 집계) */
export function deriveStock(txns: StockTxn[]): Map<string, number> {
  const acc = new Map<string, number>();
  for (const t of txns) acc.set(t.itemId, (acc.get(t.itemId) ?? 0) + t.qty);
  return acc;
}
