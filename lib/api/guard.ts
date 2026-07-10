import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canAccess } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/domain/types";
import type { SessionPayload } from "@/lib/auth/session";

/** 인증 필요. 미인증이면 { error 401 } 응답 반환(호출부에서 early return). */
export async function requireUser(): Promise<{ user: SessionPayload } | { res: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { res: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  return { user };
}

/** 최소 역할 요구. 부족하면 403. */
export async function requireRole(required: UserRole): Promise<{ user: SessionPayload } | { res: NextResponse }> {
  const r = await requireUser();
  if ("res" in r) return r;
  if (!canAccess(r.user.role, required)) {
    return { res: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return r;
}
