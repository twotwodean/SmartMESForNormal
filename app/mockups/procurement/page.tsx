import { listPurchaseOrders, listSuppliers } from "@/lib/services/procurement-service";
import { listItemsBrief } from "@/lib/services/quality-service";
import { ProcurementClient } from "./procurement-client";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const [orders, suppliers, items] = await Promise.all([
    listPurchaseOrders(),
    listSuppliers("SUPPLIER"),
    listItemsBrief(),
  ]);
  return <ProcurementClient orders={orders} suppliers={suppliers} items={items} />;
}
