import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { parsePageParams } from "@/lib/api/pagination";
import { listAuditLogs } from "@/lib/services/audit-service";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const params = parsePageParams(new URL(req.url).searchParams);
  return NextResponse.json(await listAuditLogs(params));
}
