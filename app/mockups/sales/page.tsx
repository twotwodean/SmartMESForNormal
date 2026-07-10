import { listSalesOrders, listShipments } from "@/lib/services/sales-service";
import { listSuppliers } from "@/lib/services/procurement-service";
import { listItemsBrief } from "@/lib/services/quality-service";
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [orders, shipments, customers, items] = await Promise.all([
    listSalesOrders(),
    listShipments(),
    listSuppliers("CUSTOMER"),
    listItemsBrief(),
  ]);
  return <SalesClient orders={orders} shipments={shipments} customers={customers} items={items} />;
}
