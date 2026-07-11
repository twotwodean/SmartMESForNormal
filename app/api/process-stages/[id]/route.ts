import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { ProcessStageUpdateSchema } from "@/lib/api/schemas";
import { updateProcessStage, deleteProcessStage } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, ProcessStageUpdateSchema);
  if ("res" in p) return p.res;
  try {
    const r = await updateProcessStage(params.id, p.data);
    await audit("UPDATE", "ProcessStage", r.id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  try {
    await deleteProcessStage(params.id);
    await audit("DELETE", "ProcessStage", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
