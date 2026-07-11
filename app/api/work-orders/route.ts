import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { WorkOrderCreateSchema } from "@/lib/api/schemas";
import { listWorkOrders, createWorkOrder } from "@/lib/services/work-order-service";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  return NextResponse.json(await listWorkOrders());
}

export async function POST(req: Request) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, WorkOrderCreateSchema);
  if ("res" in p) return p.res;
  const wo = await createWorkOrder(p.data);
  return NextResponse.json(wo, { status: 201 });
}
