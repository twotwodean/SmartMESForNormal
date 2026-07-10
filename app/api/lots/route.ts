import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { listLots } from "@/lib/services/lot-service";
export const runtime = "nodejs";
export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listLots());
}
