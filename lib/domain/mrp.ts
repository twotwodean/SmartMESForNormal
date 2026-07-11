import { explodeBom, type BomLink } from "@/lib/domain/bom";

/** 순소요량 = max(0, 총소요 + 안전재고 - 현재고 - 입고예정) */
export function netRequirement(gross: number, onHand: number, safety: number, incoming: number): number {
  return Math.max(0, gross + safety - onHand - incoming);
}

/** 수요(주문)들을 BOM 전개해 품목별 총소요량 집계(완제품 자체 + 하위 부품, 다단) */
export function grossDemand(orders: { itemId: string; qty: number }[], bom: BomLink[]): Map<string, number> {
  const g = new Map<string, number>();
  const add = (id: string, q: number) => g.set(id, (g.get(id) ?? 0) + q);
  for (const o of orders) {
    add(o.itemId, o.qty);
    for (const [child, q] of explodeBom(o.itemId, o.qty, bom)) add(child, q);
  }
  return g;
}
