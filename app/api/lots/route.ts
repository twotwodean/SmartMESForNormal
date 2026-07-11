import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { parsePageParams } from "@/lib/api/pagination";
import { listLotsPaged } from "@/lib/services/lot-service";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const params = parsePageParams(new URL(req.url).searchParams, { pageSize: 20 });
  return NextResponse.json(await listLotsPaged(params));
}
