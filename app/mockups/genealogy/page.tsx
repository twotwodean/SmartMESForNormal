import { listLotsPaged } from "@/lib/services/lot-service";
import { parsePageParams } from "@/lib/api/pagination";
import { GenealogyClient } from "./genealogy-client";

export const dynamic = "force-dynamic";

export default async function GenealogyPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const params = parsePageParams(searchParams, { pageSize: 20 });
  const result = await listLotsPaged(params);
  return <GenealogyClient result={result} q={params.search} />;
}
