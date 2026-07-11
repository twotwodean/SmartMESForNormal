import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { MaintenanceOrderCreateSchema } from "@/lib/api/schemas";
import { listMaintenanceOrders, createMaintenanceOrder } from "@/lib/services/equipment-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listMaintenanceOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, MaintenanceOrderCreateSchema);
  if ("res" in p) return p.res;
  try {
    const order = await createMaintenanceOrder(p.data);
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    logError("maintenance-orders POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
