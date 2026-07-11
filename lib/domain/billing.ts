import type { InvoiceStatus } from "@/lib/domain/types";

/** 미수금 = max(0, 청구액 - 수금액) */
export function outstanding(amount: number, paid: number): number {
  return Math.max(0, amount - paid);
}

/** 수금액 기준 청구 상태 */
export function invoiceStatusFor(amount: number, paid: number): InvoiceStatus {
  if (paid <= 0) return "ISSUED";
  if (paid >= amount) return "PAID";
  return "PARTIAL";
}
