import { getDashboard } from "@/lib/services/dashboard-service";
import { listWorkOrders } from "@/lib/services/work-order-service";
import { ManagerClient } from "./manager-client";

export const dynamic = "force-dynamic";

export default async function ManagerDashboard() {
  const [dashboard, workOrders] = await Promise.all([getDashboard(), listWorkOrders()]);
  return <ManagerClient dashboard={dashboard} workOrders={workOrders} />;
}
