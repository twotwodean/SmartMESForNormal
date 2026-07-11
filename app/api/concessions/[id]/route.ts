import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { ConcessionActionSchema } from "@/lib/api/schemas";
import { decideConcession } from "@/lib/services/concession-service";
import { audit } from "@/lib/services/audit-service";
import { logError } from "@/lib/log";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, ConcessionActionSchema);
  if ("res" in p) return p.res;
  try {
    const c = await decideConcession(params.id, p.data.action === "approve");
    await audit(p.data.action === "approve" ? "CONCESSION_APPROVE" : "CONCESSION_REJECT", "Concession", c.id);
    return NextResponse.json(c);
  } catch (e) {
    logError("concessions/[id] PATCH", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
