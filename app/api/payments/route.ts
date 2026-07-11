import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { PaymentCreateSchema } from "@/lib/api/schemas";
import { recordPayment } from "@/lib/services/billing-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, PaymentCreateSchema);
  if ("res" in p) return p.res;
  try {
    const result = await recordPayment(p.data);
    await audit("PAYMENT", "Payment", result.payment.id);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
