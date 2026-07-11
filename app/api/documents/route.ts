import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
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
  const body = await req.json().catch(() => null);
  if (typeof body?.name !== "string") {
    return NextResponse.json({ error: "name이 필요합니다." }, { status: 400 });
  }
  try {
    const d = await createDocument({
      name: body.name,
      rev: typeof body.rev === "string" ? body.rev : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
      itemId: typeof body.itemId === "string" ? body.itemId : undefined,
    });
    await audit("CREATE", "DocumentRev", d.id);
    return NextResponse.json(d, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
