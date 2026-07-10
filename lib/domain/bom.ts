export interface BomLink {
  parentId: string;
  childId: string;
  qtyPer: number;
}

/** parent 품목 qty 생산에 필요한 하위 품목 소요량(다단 전개) */
export function explodeBom(itemId: string, qty: number, bom: BomLink[]): Map<string, number> {
  const req = new Map<string, number>();
  const walk = (id: string, mult: number) => {
    for (const l of bom) {
      if (l.parentId === id) {
        const need = l.qtyPer * mult;
        req.set(l.childId, (req.get(l.childId) ?? 0) + need);
        walk(l.childId, need);
      }
    }
  };
  walk(itemId, qty);
  return req;
}
