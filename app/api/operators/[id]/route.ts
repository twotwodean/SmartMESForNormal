import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { OperatorUpdateSchema } from "@/lib/api/schemas";
import { updateOperator, deleteOperator } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, OperatorUpdateSchema);
  if ("res" in p) return p.res;
  try {
    const r = await updateOperator(params.id, p.data);
    await audit("UPDATE", "Operator", r.id);
    return NextResponse.json(r);
  } catch (e) {
    logError("operators/[id] PATCH", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  try {
    await deleteOperator(params.id);
    await audit("DELETE", "Operator", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("operators/[id] DELETE", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
