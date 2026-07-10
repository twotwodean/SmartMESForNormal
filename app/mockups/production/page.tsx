import { listWorkOrders } from "@/lib/services/work-order-service";
import { ProductionClient } from "./production-client";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const rows = (await listWorkOrders()).filter((w) => w.status === "WAITING" || w.status === "RUNNING");
  return <ProductionClient targets={rows} />;
}
