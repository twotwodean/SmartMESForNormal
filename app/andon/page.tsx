import { listEquipmentStates } from "@/lib/services/equipment-state-service";
import { AndonClient } from "./andon-client";

export const dynamic = "force-dynamic";

/**
 * VIS-4: Andon 대형 상태판 — /kiosk와 마찬가지로 /mockups 밖의 독립 풀스크린 라우트
 * (사이드바 없이 루트 레이아웃만 사용). 현장 대형 모니터에 상시 띄워두는 화면이다.
 */
export default async function AndonPage() {
  const rows = await listEquipmentStates();
  return <AndonClient initial={rows} />;
}
