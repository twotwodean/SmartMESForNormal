import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listProcessStages, createProcessStage } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listProcessStages());
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (typeof body?.code !== "string" || typeof body?.name !== "string" || typeof body?.seq !== "number") {
    return NextResponse.json({ error: "code·name·seq가 필요합니다." }, { status: 400 });
  }
  try {
    const r = await createProcessStage({ code: body.code, name: body.name, seq: body.seq });
    await audit("CREATE", "ProcessStage", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
