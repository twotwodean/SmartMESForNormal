import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { shipShipment, returnShipment } from "@/lib/services/sales-service";
import { audit } from "@/lib/services/audit-service";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("OPERATOR");
  if ("res" in auth) return auth.res;
  const body = await req.json().catch(() => null);
  if (body?.action !== "ship" && body?.action !== "return") {
    return NextResponse.json({ error: "action은 ship 또는 return여야 합니다." }, { status: 400 });
  }
  try {
    const sh = body.action === "ship" ? await shipShipment(params.id) : await returnShipment(params.id);
    await audit(body.action === "ship" ? "SHIP" : "RETURN", "Shipment", sh.id);
    return NextResponse.json(sh);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "오류" }, { status: 400 });
  }
}
