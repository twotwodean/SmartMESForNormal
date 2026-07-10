import type { PurchaseOrderStatus } from "@/lib/domain/types";

/** 입고 진척률(%) = 입고/발주 ×100, 0~100 캡, 발주 0이면 0 */
export function receiptProgress(ordered: number, received: number): number {
  if (ordered <= 0) return 0;
  return Math.min(100, Math.round((received / ordered) * 100));
}

/** 입고량 기준 발주 상태 */
export function poStatusFor(ordered: number, received: number): PurchaseOrderStatus {
  if (received <= 0) return "ORDERED";
  if (received >= ordered) return "RECEIVED";
  return "PARTIAL";
}
