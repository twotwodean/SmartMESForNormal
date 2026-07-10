import { listStock } from "@/lib/services/inventory-service";
import { InventoryClient } from "./inventory-client";
export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const rows = await listStock();
  return <InventoryClient rows={rows} />;
}
