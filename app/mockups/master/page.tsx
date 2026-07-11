import { listItems, listWorkCenters, listProcessStages } from "@/lib/services/master-service";
import { MasterClient } from "./master-client";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const [items, workCenters, processStages] = await Promise.all([
    listItems(),
    listWorkCenters(),
    listProcessStages(),
  ]);
  return <MasterClient items={items} workCenters={workCenters} processStages={processStages} />;
}
