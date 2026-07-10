import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listInspections, createInspection } from "@/lib/services/quality-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listInspections());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.result || !body?.itemId || typeof body.qty !== "number") {
    return NextResponse.json({ error: "type·result·itemId·qty가 필요합니다." }, { status: 400 });
  }
  try {
    const ins = await createInspection({ type: body.type, result: body.result, itemId: body.itemId, qty: body.qty, defectQty: body.defectQty ?? 0 });
    return NextResponse.json(ins, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
