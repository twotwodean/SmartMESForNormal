import { listInvoices } from "@/lib/services/billing-service";
import { listSuppliers } from "@/lib/services/procurement-service";
import { listShipments } from "@/lib/services/sales-service";
import { BillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const [invoices, customers, shipments] = await Promise.all([
    listInvoices(),
    listSuppliers("CUSTOMER"),
    listShipments(),
  ]);
  return <BillingClient invoices={invoices} customers={customers} shipments={shipments} />;
}
