import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { DocumentCreateSchema } from "@/lib/api/schemas";
import { listDocuments, createDocument } from "@/lib/services/catalog-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listDocuments());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, DocumentCreateSchema);
  if ("res" in p) return p.res;
  try {
    const d = await createDocument(p.data);
    await audit("CREATE", "DocumentRev", d.id);
    return NextResponse.json(d, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
