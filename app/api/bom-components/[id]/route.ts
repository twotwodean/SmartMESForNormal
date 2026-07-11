import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateBomQty, removeBomComponent } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (typeof body?.qtyPer !== "number") {
    return NextResponse.json({ error: "qtyPer가 필요합니다." }, { status: 400 });
  }
  try {
    const r = await updateBomQty(params.id, body.qtyPer);
    await audit("UPDATE", "BomComponent", r.id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  try {
    await removeBomComponent(params.id);
    await audit("DELETE", "BomComponent", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
