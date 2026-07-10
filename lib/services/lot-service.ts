import { prisma } from "@/lib/db";
import { ancestors, descendants } from "@/lib/domain/genealogy";

export interface LotRef {
  id: string;
  code: string;
  itemName: string;
  status: string;
}
export interface LotTree {
  id: string;
  code: string;
  itemName: string;
  status: string;
  ancestors: LotRef[];
  descendants: LotRef[];
}

export async function listLots(): Promise<LotRef[]> {
  const lots = await prisma.lot.findMany({ include: { item: true }, orderBy: { createdAt: "desc" } });
  return lots.map((l) => ({ id: l.id, code: l.code, itemName: l.item.name, status: l.status }));
}

/** code로 Lot 조회 + 계보(조상/후손) */
export async function lotTree(code: string): Promise<LotTree | null> {
  const lot = await prisma.lot.findUnique({ where: { code }, include: { item: true } });
  if (!lot) return null;
  const links = await prisma.lotGenealogy.findMany();
  const ancIds = ancestors(lot.id, links);
  const descIds = descendants(lot.id, links);
  const refLots = await prisma.lot.findMany({ where: { id: { in: [...ancIds, ...descIds] } }, include: { item: true } });
  const toRef = (id: string): LotRef | undefined => {
    const l = refLots.find((x) => x.id === id);
    return l ? { id: l.id, code: l.code, itemName: l.item.name, status: l.status } : undefined;
  };
  return {
    id: lot.id, code: lot.code, itemName: lot.item.name, status: lot.status,
    ancestors: ancIds.map(toRef).filter((x): x is LotRef => Boolean(x)),
    descendants: descIds.map(toRef).filter((x): x is LotRef => Boolean(x)),
  };
}
