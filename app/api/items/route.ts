import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listItems, createItem } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
import type { ItemType } from "@/lib/domain/types";
export const runtime = "nodejs";

const ITEM_TYPES: ItemType[] = ["FINISHED", "SEMI", "RAW", "SUB"];

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listItems());
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (
    typeof body?.code !== "string" ||
    typeof body?.name !== "string" ||
    typeof body?.type !== "string" ||
    !ITEM_TYPES.includes(body.type as ItemType) ||
    typeof body?.uom !== "string" ||
    typeof body?.safetyStock !== "number"
  ) {
    return NextResponse.json({ error: "code·name·type·uom·safetyStock이 필요합니다." }, { status: 400 });
  }
  try {
    const r = await createItem({
      code: body.code,
      name: body.name,
      type: body.type as ItemType,
      uom: body.uom,
      safetyStock: body.safetyStock,
    });
    await audit("CREATE", "Item", r.id);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
