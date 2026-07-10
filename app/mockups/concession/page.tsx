import { listConcessions } from "@/lib/services/concession-service";
import { listItemsBrief } from "@/lib/services/quality-service";
import { ConcessionClient } from "./concession-client";

export const dynamic = "force-dynamic";

export default async function ConcessionPage() {
  const [concessions, items] = await Promise.all([listConcessions(), listItemsBrief()]);
  return <ConcessionClient concessions={concessions} items={items} />;
}
