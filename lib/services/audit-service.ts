import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { paginated, type PageParams, type Paginated } from "@/lib/api/pagination";
import type { Prisma } from "@prisma/client";

/** 주요 변경 감사 기록(현재 세션 사용자). 실패해도 본 트랜잭션을 막지 않도록 호출부에서 await하되 예외는 무시 가능. */
export async function audit(action: string, entity: string, entityId?: string): Promise<void> {
  const user = await getCurrentUser();
  await prisma.auditLog.create({ data: { userId: user?.userId ?? null, action, entity, entityId: entityId ?? null } });
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userName: string | null;
  createdAt: string;
}
export async function listAuditLogs(params: PageParams): Promise<Paginated<AuditRow>> {
  const { page, pageSize, search } = params;
  const where: Prisma.AuditLogWhereInput = search
    ? {
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { entity: { contains: search, mode: "insensitive" } },
          { entityId: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const mapped: AuditRow[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    userName: r.user?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  return paginated(mapped, total, params);
}
