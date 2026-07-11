import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { parsePageParams } from "@/lib/api/pagination";
import { InventoryTxnCreateSchema } from "@/lib/api/schemas";
import { listTxnsPaged, createTxn } from "@/lib/services/inventory-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId가 필요합니다." }, { status: 400 });
  const params = parsePageParams(url.searchParams);
  return NextResponse.json(await listTxnsPaged({ itemId, ...params }));
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, InventoryTxnCreateSchema);
  if ("res" in p) return p.res;
  const txn = await createTxn(p.data);
  await audit("INVENTORY_TXN", "InventoryTxn", txn.id);
  return NextResponse.json(txn, { status: 201 });
}
