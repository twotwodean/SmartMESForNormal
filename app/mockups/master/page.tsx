import {
  listItems,
  listWorkCenters,
  listProcessStages,
  listOperators,
  listShifts,
  listDowntimeReasons,
} from "@/lib/services/master-service";
import { MasterClient } from "./master-client";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const [items, workCenters, processStages, operators, shifts, downtimeReasons] = await Promise.all([
    listItems(),
    listWorkCenters(),
    listProcessStages(),
    listOperators(),
    listShifts(),
    listDowntimeReasons(),
  ]);
  return (
    <MasterClient
      items={items}
      workCenters={workCenters}
      processStages={processStages}
      operators={operators}
      shifts={shifts}
      downtimeReasons={downtimeReasons}
    />
  );
}
