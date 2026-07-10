import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listMaintenanceOrders, createMaintenanceOrder } from "@/lib/services/equipment-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listMaintenanceOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.equipmentId || !body?.type) {
    return NextResponse.json({ error: "equipmentId와 type이 필요합니다." }, { status: 400 });
  }
  try {
    const order = await createMaintenanceOrder({ equipmentId: body.equipmentId, type: body.type, description: body.description });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
