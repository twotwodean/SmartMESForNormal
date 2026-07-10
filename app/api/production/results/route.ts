import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { registerResult } from "@/lib/services/production-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.workOrderId || typeof body.goodQty !== "number") {
    return NextResponse.json({ error: "workOrderId와 goodQty가 필요합니다." }, { status: 400 });
  }
  try {
    const out = await registerResult({
      workOrderId: body.workOrderId, goodQty: body.goodQty,
      defectQty: body.defectQty, downtimeMin: body.downtimeMin,
    });
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
