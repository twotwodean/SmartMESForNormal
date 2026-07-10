import { listWorkOrders } from "@/lib/services/work-order-service";
import { KioskClient } from "./kiosk-client";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const targets = (await listWorkOrders()).filter((w) => w.status === "WAITING" || w.status === "RUNNING");
  return <KioskClient targets={targets} />;
}
