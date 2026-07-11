import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { ProductionResultCreateSchema } from "@/lib/api/schemas";
import { registerResult } from "@/lib/services/production-service";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, ProductionResultCreateSchema);
  if ("res" in p) return p.res;
  try {
    const out = await registerResult(p.data);
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
