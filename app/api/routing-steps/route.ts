import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { addRoutingStep } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (
    typeof body?.routingId !== "string" ||
    typeof body?.processStageId !== "string" ||
    typeof body?.seq !== "number" ||
    typeof body?.stdTimeMin !== "number" ||
    (body?.workCenterId != null && typeof body.workCenterId !== "string")
  ) {
    return NextResponse.json(
      { error: "routingId·processStageId·seq·stdTimeMin이 필요합니다." },
      { status: 400 },
    );
  }
  try {
    const r = await addRoutingStep({
      routingId: body.routingId,
      processStageId: body.processStageId,
      workCenterId: typeof body.workCenterId === "string" ? body.workCenterId : undefined,
      seq: body.seq,
      stdTimeMin: body.stdTimeMin,
    });
    await audit("CREATE", "RoutingStep", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
