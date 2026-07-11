import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { ConcessionCreateSchema } from "@/lib/api/schemas";
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
  const p = await parseBody(req, ConcessionCreateSchema);
  if ("res" in p) return p.res;
  try {
    const c = await createConcession(p.data);
    return NextResponse.json(c, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
