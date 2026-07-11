import { listProductModels, listDocuments } from "@/lib/services/catalog-service";
import { listItemsBrief } from "@/lib/services/quality-service";
import { CatalogClient } from "./catalog-client";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [models, documents, items] = await Promise.all([
    listProductModels(),
    listDocuments(),
    listItemsBrief(),
  ]);
  return <CatalogClient models={models} documents={documents} items={items} />;
}
