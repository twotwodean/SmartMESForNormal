import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { GoodsReceiptCreateSchema } from "@/lib/api/schemas";
import { receiveGoods } from "@/lib/services/procurement-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, GoodsReceiptCreateSchema);
  if ("res" in p) return p.res;
  try {
    const out = await receiveGoods(p.data);
    await audit("GOODS_RECEIPT", "GoodsReceipt", out.receipt.id);
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    logError("goods-receipts POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
