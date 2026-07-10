import { qualitySummary, listInspections, listNonconformances, listItemsBrief } from "@/lib/services/quality-service";
import { QualityClient } from "./quality-client";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const [summary, inspections, nonconformances, items] = await Promise.all([
    qualitySummary(),
    listInspections(),
    listNonconformances(),
    listItemsBrief(),
  ]);
  return <QualityClient summary={summary} inspections={inspections} nonconformances={nonconformances} items={items} />;
}
