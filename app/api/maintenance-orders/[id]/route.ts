import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { MaintenanceActionSchema } from "@/lib/api/schemas";
import { advanceMaintenance } from "@/lib/services/equipment-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, MaintenanceActionSchema);
  if ("res" in p) return p.res;
  try {
    const order = await advanceMaintenance(params.id, p.data.action);
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
