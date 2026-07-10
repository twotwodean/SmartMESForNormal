import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

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
export async function listAuditLogs(limit = 100): Promise<AuditRow[]> {
  const rows = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({ id: r.id, action: r.action, entity: r.entity, entityId: r.entityId, userName: r.user?.name ?? null, createdAt: r.createdAt.toISOString() }));
}
