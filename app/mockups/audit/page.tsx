import { listAuditLogs } from "@/lib/services/audit-service";
import { parsePageParams } from "@/lib/api/pagination";
import { AuditClient } from "./audit-client";
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const params = parsePageParams(searchParams, { pageSize: 20 });
  const result = await listAuditLogs(params);
  return <AuditClient result={result} q={params.search} />;
}
