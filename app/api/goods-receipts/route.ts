import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { receiveGoods } from "@/lib/services/procurement-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.purchaseOrderId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "purchaseOrderId·qty가 필요합니다." }, { status: 400 });
  }
  try {
    const out = await receiveGoods({ purchaseOrderId: body.purchaseOrderId, qty: body.qty });
    await audit("GOODS_RECEIPT", "GoodsReceipt", out.receipt.id);
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
