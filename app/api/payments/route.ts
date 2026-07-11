import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { recordPayment } from "@/lib/services/billing-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.invoiceId || typeof body.amount !== "number") {
    return NextResponse.json({ error: "invoiceId·amount가 필요합니다." }, { status: 400 });
  }
  try {
    const result = await recordPayment({ invoiceId: body.invoiceId, amount: body.amount });
    await audit("PAYMENT", "Payment", result.payment.id);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
