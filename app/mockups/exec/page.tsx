import { getExecSummary } from "@/lib/services/exec-service";
import { ExecClient } from "./exec-client";

export const dynamic = "force-dynamic";

export default async function ExecDashboard() {
  const summary = await getExecSummary();
  return <ExecClient initial={summary} />;
}
