import { listAuditLogs } from "@/lib/services/audit-service";
import { AuditClient } from "./audit-client";
export const dynamic = "force-dynamic";
export default async function AuditPage() {
  const logs = await listAuditLogs();
  return <AuditClient logs={logs} />;
}
