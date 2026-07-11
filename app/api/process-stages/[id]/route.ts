import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateProcessStage, deleteProcessStage } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (body?.seq != null && typeof body.seq !== "number") {
    return NextResponse.json({ error: "seq는 숫자여야 합니다." }, { status: 400 });
  }
  try {
    const r = await updateProcessStage(params.id, {
      name: typeof body?.name === "string" ? body.name : undefined,
      seq: typeof body?.seq === "number" ? body.seq : undefined,
    });
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
