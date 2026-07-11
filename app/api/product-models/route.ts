import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listProductModels, createProductModel } from "@/lib/services/catalog-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listProductModels());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.itemId || typeof body.code !== "string" || typeof body.name !== "string") {
    return NextResponse.json({ error: "itemId·code·name이 필요합니다." }, { status: 400 });
  }
  try {
    const m = await createProductModel({
      itemId: body.itemId,
      code: body.code,
      name: body.name,
      spec: typeof body.spec === "string" ? body.spec : undefined,
    });
    await audit("CREATE", "ProductModel", m.id);
    return NextResponse.json(m, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
