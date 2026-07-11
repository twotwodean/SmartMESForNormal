import { listEquipmentStates } from "@/lib/services/equipment-state-service";
import { MonitoringClient } from "./monitoring-client";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const rows = await listEquipmentStates();
  return <MonitoringClient initial={rows} />;
}
