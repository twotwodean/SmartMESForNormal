import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listShipments, createShipment } from "@/lib/services/sales-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listShipments());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.salesOrderId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "salesOrderId·qty가 필요합니다." }, { status: 400 });
  }
  try {
    const sh = await createShipment({ salesOrderId: body.salesOrderId, qty: body.qty });
    return NextResponse.json(sh, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
