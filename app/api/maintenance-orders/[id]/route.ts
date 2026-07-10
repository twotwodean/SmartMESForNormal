import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { advanceMaintenance } from "@/lib/services/equipment-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (body?.action !== "start" && body?.action !== "finish") {
    return NextResponse.json({ error: "action은 start 또는 finish여야 합니다." }, { status: 400 });
  }
  try {
    const order = await advanceMaintenance(params.id, body.action);
    return NextResponse.json(order);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
