import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listPurchaseOrders, createPurchaseOrder } from "@/lib/services/procurement-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listPurchaseOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.supplierId || !body?.itemId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "supplierId·itemId·qty가 필요합니다." }, { status: 400 });
  }
  try {
    const po = await createPurchaseOrder({ supplierId: body.supplierId, itemId: body.itemId, qty: body.qty });
    return NextResponse.json(po, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
