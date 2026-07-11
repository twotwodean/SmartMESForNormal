import { listLots } from "@/lib/services/lot-service";
import { LabelsClient } from "./labels-client";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const lots = await listLots();
  return <LabelsClient lots={lots} />;
}
