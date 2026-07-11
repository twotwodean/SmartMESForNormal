import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { InvoiceCreateSchema } from "@/lib/api/schemas";
import { listInvoices, createInvoice } from "@/lib/services/billing-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listInvoices());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, InvoiceCreateSchema);
  if ("res" in p) return p.res;
  try {
    const inv = await createInvoice(p.data);
    await audit("CREATE", "Invoice", inv.id);
    return NextResponse.json(inv, { status: 201 });
  } catch (e) {
    logError("invoices POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
