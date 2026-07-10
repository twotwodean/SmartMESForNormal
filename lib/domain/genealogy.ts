export interface GenLink {
  parentLotId: string;
  childLotId: string;
}

/** lotId의 모든 후손 lotId (중복 제거, 자신 제외) */
export function descendants(lotId: string, links: GenLink[]): string[] {
  const out = new Set<string>();
  const walk = (id: string) => {
    for (const l of links) {
      if (l.parentLotId === id && !out.has(l.childLotId)) {
        out.add(l.childLotId);
        walk(l.childLotId);
      }
    }
  };
  walk(lotId);
  return [...out];
}

/** lotId의 모든 조상 lotId (중복 제거, 자신 제외) */
export function ancestors(lotId: string, links: GenLink[]): string[] {
  const out = new Set<string>();
  const walk = (id: string) => {
    for (const l of links) {
      if (l.childLotId === id && !out.has(l.parentLotId)) {
        out.add(l.parentLotId);
        walk(l.parentLotId);
      }
    }
  };
  walk(lotId);
  return [...out];
}
