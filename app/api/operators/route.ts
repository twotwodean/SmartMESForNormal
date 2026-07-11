import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { OperatorCreateSchema } from "@/lib/api/schemas";
import { listOperators, createOperator } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listOperators());
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, OperatorCreateSchema);
  if ("res" in p) return p.res;
  try {
    const r = await createOperator(p.data);
    await audit("CREATE", "Operator", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    logError("operators POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
