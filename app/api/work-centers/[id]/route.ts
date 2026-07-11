import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateWorkCenter, deleteWorkCenter } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  try {
    const r = await updateWorkCenter(params.id, {
      name: typeof body?.name === "string" ? body.name : undefined,
    });
    await audit("UPDATE", "WorkCenter", r.id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  try {
    await deleteWorkCenter(params.id);
    await audit("DELETE", "WorkCenter", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
