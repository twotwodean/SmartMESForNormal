import { listWorkOrders } from "@/lib/services/work-order-service";
import { WorkOrdersClient } from "./work-orders-client";
export const dynamic = "force-dynamic";
export default async function WorkOrdersPage() {
  const rows = await listWorkOrders();
  return <WorkOrdersClient rows={rows} />;
}
