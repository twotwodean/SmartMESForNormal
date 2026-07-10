import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { listTxns, createTxn } from "@/lib/services/inventory-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId가 필요합니다." }, { status: 400 });
  return NextResponse.json(await listTxns(itemId));
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (!body?.itemId || !body?.type || typeof body.qty !== "number") {
    return NextResponse.json({ error: "itemId·type·qty가 필요합니다." }, { status: 400 });
  }
  const txn = await createTxn({ itemId: body.itemId, type: body.type, qty: body.qty, ref: body.ref });
  await audit("INVENTORY_TXN", "InventoryTxn", txn.id);
  return NextResponse.json(txn, { status: 201 });
}
