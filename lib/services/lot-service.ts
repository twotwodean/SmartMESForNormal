import { prisma } from "@/lib/db";
import { ancestors, descendants } from "@/lib/domain/genealogy";
import { paginated, type PageParams, type Paginated } from "@/lib/api/pagination";
import type { Prisma } from "@prisma/client";

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

/** Lot 목록(페이지네이션) — Lot 코드/품목코드/품목명 검색 */
export async function listLotsPaged(params: PageParams): Promise<Paginated<LotRef>> {
  const { page, pageSize, search } = params;
  const where: Prisma.LotWhereInput = search
    ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { item: { code: { contains: search, mode: "insensitive" } } },
          { item: { name: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.lot.findMany({
      where,
      include: { item: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lot.count({ where }),
  ]);

  const mapped: LotRef[] = rows.map((l) => ({ id: l.id, code: l.code, itemName: l.item.name, status: l.status }));
  return paginated(mapped, total, params);
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
