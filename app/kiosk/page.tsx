import { listWorkOrders } from "@/lib/services/work-order-service";
import { listOperators, listShifts } from "@/lib/services/master-service";
import { KioskClient } from "./kiosk-client";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const [targetsAll, operators, shifts] = await Promise.all([
    listWorkOrders(),
    listOperators(),
    listShifts(),
  ]);
  const targets = targetsAll.filter((w) => w.status === "WAITING" || w.status === "RUNNING");
  return <KioskClient targets={targets} operators={operators} shifts={shifts} />;
}
