import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listWorkOrders, createWorkOrder } from "@/lib/services/work-order-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listWorkOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.itemId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "itemId와 qty가 필요합니다." }, { status: 400 });
  }
  const wo = await createWorkOrder({ itemId: body.itemId, qty: body.qty, workCenterId: body.workCenterId });
  return NextResponse.json(wo, { status: 201 });
}
