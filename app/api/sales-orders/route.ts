import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listSalesOrders, createSalesOrder } from "@/lib/services/sales-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listSalesOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.customerId || !body?.itemId || typeof body.qty !== "number" || !body?.dueDate) {
    return NextResponse.json({ error: "customerId·itemId·qty·dueDate가 필요합니다." }, { status: 400 });
  }
  try {
    const so = await createSalesOrder({ customerId: body.customerId, itemId: body.itemId, qty: body.qty, dueDate: body.dueDate });
    return NextResponse.json(so, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
