import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { decideConcession } from "@/lib/services/concession-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (body?.action !== "approve" && body?.action !== "reject") {
    return NextResponse.json({ error: "action은 approve 또는 reject여야 합니다." }, { status: 400 });
  }
  try {
    const c = await decideConcession(params.id, body.action === "approve");
    await audit(body.action === "approve" ? "CONCESSION_APPROVE" : "CONCESSION_REJECT", "Concession", c.id);
    return NextResponse.json(c);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
