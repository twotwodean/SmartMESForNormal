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

/** parent에 child를 추가하면 순환이 생기는가? (child가 parent의 조상이거나 자기 자신) */
export function wouldCreateCycle(parentId: string, childId: string, links: BomLink[]): boolean {
  if (parentId === childId) return true;
  // child로부터 하위(자손) 전개했을 때 parent가 나오면 순환
  const stack = [childId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === parentId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const l of links) if (l.parentId === cur) stack.push(l.childId);
  }
  return false;
}
