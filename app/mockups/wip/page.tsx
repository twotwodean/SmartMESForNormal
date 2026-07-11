import { getWipBoard } from "@/lib/services/wip-service";
import { WipClient } from "./wip-client";

export const dynamic = "force-dynamic";

export default async function WipPage() {
  const board = await getWipBoard();
  return <WipClient initial={board} />;
}
