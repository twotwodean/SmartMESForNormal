import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ts = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up", ts }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down", ts }, { status: 503 });
  }
}
