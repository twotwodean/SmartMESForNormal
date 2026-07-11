import { computeMrp } from "@/lib/services/mrp-service";
import { MrpClient } from "./mrp-client";

export const dynamic = "force-dynamic";

export default async function MrpPage() {
  const rows = await computeMrp();
  return <MrpClient rows={rows} />;
}
