import { prisma } from "@/lib/db";
import type { AlarmTone } from "@/lib/domain/types";

export interface AlarmRow {
  id: string;
  tone: AlarmTone;
  title: string;
  message: string | null;
  createdAt: string;
}
export async function listAlarms(limit = 20): Promise<AlarmRow[]> {
  const rows = await prisma.alarm.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({ id: r.id, tone: r.tone as AlarmTone, title: r.title, message: r.message, createdAt: r.createdAt.toISOString() }));
}
