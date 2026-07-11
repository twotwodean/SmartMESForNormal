import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { BomComponentCreateSchema } from "@/lib/api/schemas";
import { listBom, addBomComponent } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const parentId = new URL(req.url).searchParams.get("parentId");
  if (!parentId) return NextResponse.json({ error: "parentId가 필요합니다." }, { status: 400 });
  return NextResponse.json(await listBom(parentId));
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, BomComponentCreateSchema);
  if ("res" in p) return p.res;
  try {
    const r = await addBomComponent(p.data);
    await audit("CREATE", "BomComponent", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
