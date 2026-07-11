import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { RoutingStepCreateSchema } from "@/lib/api/schemas";
import { addRoutingStep } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, RoutingStepCreateSchema);
  if ("res" in p) return p.res;
  try {
    const r = await addRoutingStep(p.data);
    await audit("CREATE", "RoutingStep", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    logError("routing-steps POST", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
