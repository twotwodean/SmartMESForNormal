import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { PurchaseOrderCreateSchema } from "@/lib/api/schemas";
import { listPurchaseOrders, createPurchaseOrder } from "@/lib/services/procurement-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listPurchaseOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, PurchaseOrderCreateSchema);
  if ("res" in p) return p.res;
  try {
    const po = await createPurchaseOrder(p.data);
    return NextResponse.json(po, { status: 201 });
  } catch (e) {
    logError("purchase-orders POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
