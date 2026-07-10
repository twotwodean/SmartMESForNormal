import type { UserRole } from "@/lib/domain/types";

const RANK: Record<UserRole, number> = { VIEWER: 1, OPERATOR: 2, ADMIN: 3 };

/** role이 required 이상 권한인가 (ADMIN⊇OPERATOR⊇VIEWER) */
export function canAccess(role: UserRole, required: UserRole): boolean {
  return RANK[role] >= RANK[required];
}
