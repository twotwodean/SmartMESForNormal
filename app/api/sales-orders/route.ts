import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { SalesOrderCreateSchema } from "@/lib/api/schemas";
import { listSalesOrders, createSalesOrder } from "@/lib/services/sales-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listSalesOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, SalesOrderCreateSchema);
  if ("res" in p) return p.res;
  try {
    const so = await createSalesOrder(p.data);
    return NextResponse.json(so, { status: 201 });
  } catch (e) {
    logError("sales-orders POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
