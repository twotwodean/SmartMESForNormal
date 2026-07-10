import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateStatus } from "@/lib/services/work-order-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.status) return NextResponse.json({ error: "status가 필요합니다." }, { status: 400 });
  try {
    const wo = await updateStatus(params.id, body.status);
    return NextResponse.json(wo);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
