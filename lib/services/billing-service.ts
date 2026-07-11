import { prisma } from "@/lib/db";
import { invoiceStatusFor, outstanding } from "@/lib/domain/billing";
import type { InvoiceStatus } from "@/lib/domain/types";

export interface InvoiceRow {
  id: string;
  code: string;
  customerName: string;
  shipmentCode: string | null;
  amount: number;
  paid: number;
  outstanding: number;
  status: InvoiceStatus;
  issuedAt: string;
}

export async function listInvoices(): Promise<InvoiceRow[]> {
  const rows = await prisma.invoice.findMany({ include: { customer: true, shipment: true, payments: true }, orderBy: { issuedAt: "desc" } });
  return rows.map((r) => {
    const paid = r.payments.reduce((a, p) => a + p.amount, 0);
    return {
      id: r.id, code: r.code, customerName: r.customer.name,
      shipmentCode: r.shipment?.code ?? null,
      amount: r.amount, paid, outstanding: outstanding(r.amount, paid),
      status: invoiceStatusFor(r.amount, paid), issuedAt: r.issuedAt.toISOString(),
    };
  });
}

let invSeq = 0;
export async function createInvoice(input: { customerId: string; amount: number; shipmentId?: string }) {
  if (input.amount <= 0) throw new Error("청구액은 1 이상이어야 합니다.");
  invSeq += 1;
  const code = `INV-${Date.now().toString().slice(-6)}-${String(invSeq).padStart(3, "0")}`;
  return prisma.invoice.create({ data: { code, customerId: input.customerId, amount: input.amount, shipmentId: input.shipmentId ?? null, status: "ISSUED" } });
}

/** 수금 등록(원자적): Payment 생성 + 청구 상태 재계산 */
export async function recordPayment(input: { invoiceId: string; amount: number }) {
  if (input.amount <= 0) throw new Error("수금액은 1 이상이어야 합니다.");
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({ where: { id: input.invoiceId }, include: { payments: true } });
    if (!inv) throw new Error("청구를 찾을 수 없습니다.");
    const payment = await tx.payment.create({ data: { invoiceId: inv.id, amount: input.amount } });
    const paid = inv.payments.reduce((a, p) => a + p.amount, 0) + input.amount;
    const updated = await tx.invoice.update({ where: { id: inv.id }, data: { status: invoiceStatusFor(inv.amount, paid) } });
    return { payment, invoice: updated };
  });
}
