import { listLots } from "@/lib/services/lot-service";
import { GenealogyClient } from "./genealogy-client";

export const dynamic = "force-dynamic";

export default async function GenealogyPage() {
  const lots = await listLots();
  return <GenealogyClient lots={lots} />;
}
