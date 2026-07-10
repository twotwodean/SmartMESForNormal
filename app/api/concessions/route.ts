import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listConcessions, createConcession } from "@/lib/services/concession-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listConcessions());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.itemId || typeof body.qty !== "number" || typeof body.reason !== "string") {
    return NextResponse.json({ error: "itemId·qty·reason이 필요합니다." }, { status: 400 });
  }
  try {
    const c = await createConcession({ itemId: body.itemId, qty: body.qty, reason: body.reason });
    return NextResponse.json(c, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
