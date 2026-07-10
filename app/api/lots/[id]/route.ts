import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/guard";
import { lotTree } from "@/lib/services/lot-service";
export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("res" in auth) return auth.res;
  const tree = await lotTree(params.id);
  if (!tree) return NextResponse.json({ error: "Lot을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(tree);
}
