import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { deleteRouting } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  try {
    await deleteRouting(params.id);
    await audit("DELETE", "Routing", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("routings/[id] DELETE", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
