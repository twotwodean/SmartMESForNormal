import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { updateItem, deleteItem } from "@/lib/services/master-service";
import { audit } from "@/lib/services/audit-service";
import type { ItemType } from "@/lib/domain/types";
export const runtime = "nodejs";

const ITEM_TYPES: ItemType[] = ["FINISHED", "SEMI", "RAW", "SUB"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (body?.type != null && !ITEM_TYPES.includes(body.type as ItemType)) {
    return NextResponse.json({ error: "type이 올바르지 않습니다." }, { status: 400 });
  }
  try {
    const r = await updateItem(params.id, {
      name: typeof body?.name === "string" ? body.name : undefined,
      type: typeof body?.type === "string" ? (body.type as ItemType) : undefined,
      uom: typeof body?.uom === "string" ? body.uom : undefined,
      safetyStock: typeof body?.safetyStock === "number" ? body.safetyStock : undefined,
    });
    await audit("UPDATE", "Item", r.id);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if ("res" in auth) return auth.res;
  try {
    await deleteItem(params.id);
    await audit("DELETE", "Item", params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
