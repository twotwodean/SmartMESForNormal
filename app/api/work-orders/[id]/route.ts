import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { WorkOrderUpdateSchema } from "@/lib/api/schemas";
import { updateStatus } from "@/lib/services/work-order-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, WorkOrderUpdateSchema);
  if ("res" in p) return p.res;
  try {
    const wo = await updateStatus(params.id, p.data.status);
    return NextResponse.json(wo);
  } catch (e) {
    logError("work-orders/[id] PATCH", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
