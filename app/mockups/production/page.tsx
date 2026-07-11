import { listWorkOrders } from "@/lib/services/work-order-service";
import { listOperators, listShifts, listDowntimeReasons } from "@/lib/services/master-service";
import { listRecentResults } from "@/lib/services/production-service";
import { ProductionClient } from "./production-client";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const [rowsAll, operators, shifts, downtimeReasons, recentResults] = await Promise.all([
    listWorkOrders(),
    listOperators(),
    listShifts(),
    listDowntimeReasons(),
    listRecentResults(20),
  ]);
  const rows = rowsAll.filter((w) => w.status === "WAITING" || w.status === "RUNNING");
  return (
    <ProductionClient
      targets={rows}
      operators={operators}
      shifts={shifts}
      downtimeReasons={downtimeReasons}
      recentResults={recentResults}
    />
  );
}
