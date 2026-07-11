import { listEquipmentStates } from "@/lib/services/equipment-state-service";
import { getFloorLayout } from "@/lib/services/floor-service";
import { FloorClient } from "./floor-client";

export const dynamic = "force-dynamic";

export default async function FloorPage() {
  const [rows, layout] = await Promise.all([listEquipmentStates(), getFloorLayout()]);
  return <FloorClient initial={rows} layout={layout} />;
}
