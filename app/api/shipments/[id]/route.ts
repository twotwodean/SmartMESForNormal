import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { parseBody } from "@/lib/api/validate";
import { ShipmentActionSchema } from "@/lib/api/schemas";
import { shipShipment, returnShipment } from "@/lib/services/sales-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const p = await parseBody(req, ShipmentActionSchema);
  if ("res" in p) return p.res;
  try {
    const sh = p.data.action === "ship" ? await shipShipment(params.id) : await returnShipment(params.id);
    await audit(p.data.action === "ship" ? "SHIP" : "RETURN", "Shipment", sh.id);
    return NextResponse.json(sh);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
