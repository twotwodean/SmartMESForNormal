import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listInvoices, createInvoice } from "@/lib/services/billing-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listInvoices());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.customerId || typeof body.amount !== "number") {
    return NextResponse.json({ error: "customerId·amount가 필요합니다." }, { status: 400 });
  }
  try {
    const inv = await createInvoice({ customerId: body.customerId, amount: body.amount, shipmentId: body.shipmentId ?? undefined });
    await audit("CREATE", "Invoice", inv.id);
    return NextResponse.json(inv, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
