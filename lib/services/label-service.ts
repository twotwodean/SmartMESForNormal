import { prisma } from "@/lib/db";

export interface LotLabel {
  id: string;
  code: string;
  itemCode: string;
  itemName: string;
  qty: number;
  status: string;
  createdAt: Date;
}

/** id 목록으로 로트 라벨 데이터를 조회한다. 입력 순서를 최대한 보존한다. */
export async function getLotLabels(ids: string[]): Promise<LotLabel[]> {
  if (ids.length === 0) return [];

  const lots = await prisma.lot.findMany({
    where: { id: { in: ids } },
    include: { item: true },
  });

  const byId = new Map(lots.map((l) => [l.id, l]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return ordered.map((l) => ({
    id: l.id,
    code: l.code,
    itemCode: l.item.code,
    itemName: l.item.name,
    qty: l.qty,
    status: l.status,
    createdAt: l.createdAt,
  }));
}

/** 최근 생성된 로트 라벨 목록(기본 진입 화면용) */
export async function getRecentLotLabels(limit = 30): Promise<LotLabel[]> {
  const lots = await prisma.lot.findMany({
    include: { item: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return lots.map((l) => ({
    id: l.id,
    code: l.code,
    itemCode: l.item.code,
    itemName: l.item.name,
    qty: l.qty,
    status: l.status,
    createdAt: l.createdAt,
  }));
}
