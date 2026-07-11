import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { RoutingCreateSchema } from "@/lib/api/schemas";
import { listRoutings, createRouting } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId가 필요합니다." }, { status: 400 });
  return NextResponse.json(await listRoutings(itemId));
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, RoutingCreateSchema);
  if ("res" in p) return p.res;
  try {
    const r = await createRouting(p.data);
    await audit("CREATE", "Routing", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
