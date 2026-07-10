import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { listSuppliers } from "@/lib/services/procurement-service";
import type { SupplierType } from "@/lib/domain/types";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const type = new URL(req.url).searchParams.get("type");
  const filter = type === "SUPPLIER" || type === "CUSTOMER" ? (type as SupplierType) : undefined;
  return NextResponse.json(await listSuppliers(filter));
}
