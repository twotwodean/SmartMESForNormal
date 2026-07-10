import {
  maintenanceSummary,
  listEquipment,
  listMaintenanceOrders,
  listSchedules,
  listEquipmentBrief,
} from "@/lib/services/equipment-service";
import { EquipmentClient } from "./equipment-client";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  const [summary, equipment, orders, schedules, brief] = await Promise.all([
    maintenanceSummary(),
    listEquipment(),
    listMaintenanceOrders(),
    listSchedules(),
    listEquipmentBrief(),
  ]);
  return (
    <EquipmentClient
      summary={summary}
      equipment={equipment}
      orders={orders}
      schedules={schedules}
      brief={brief}
    />
  );
}
