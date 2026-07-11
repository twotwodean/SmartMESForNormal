import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listWorkCenters, createWorkCenter } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listWorkCenters());
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (typeof body?.code !== "string" || typeof body?.name !== "string") {
    return NextResponse.json({ error: "code·name이 필요합니다." }, { status: 400 });
  }
  try {
    const r = await createWorkCenter({ code: body.code, name: body.name });
    await audit("CREATE", "WorkCenter", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
