import { prisma } from "@/lib/db";
import { receiptProgress, poStatusFor } from "@/lib/domain/procurement";
import type { PurchaseOrderStatus, SupplierType } from "@/lib/domain/types";

export interface PurchaseOrderRow {
  id: string;
  code: string;
  supplierName: string;
  itemName: string;
  qty: number;
  received: number;
  progress: number;
  status: PurchaseOrderStatus;
  orderedAt: string;
}

export async function listPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const rows = await prisma.purchaseOrder.findMany({ include: { supplier: true, item: true, receipts: true }, orderBy: { orderedAt: "desc" } });
  return rows.map((r) => {
    const received = r.receipts.reduce((a, b) => a + b.qty, 0);
    return {
      id: r.id, code: r.code, supplierName: r.supplier.name, itemName: r.item.name,
      qty: r.qty, received, progress: receiptProgress(r.qty, received),
      status: r.status as PurchaseOrderStatus, orderedAt: r.orderedAt.toISOString(),
    };
  });
}

export interface SupplierRow { id: string; code: string; name: string; type: SupplierType; }
export async function listSuppliers(type?: SupplierType): Promise<SupplierRow[]> {
  const rows = await prisma.supplier.findMany({ where: type ? { type } : undefined, orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type as SupplierType }));
}

let poSeq = 0;
export async function createPurchaseOrder(input: { supplierId: string; itemId: string; qty: number }) {
  poSeq += 1;
  const code = `PO-${Date.now().toString().slice(-6)}-${String(poSeq).padStart(3, "0")}`;
  return prisma.purchaseOrder.create({ data: { code, supplierId: input.supplierId, itemId: input.itemId, qty: input.qty, status: "ORDERED" } });
}

let grSeq = 0;
/** 입고 처리(원자적): GoodsReceipt + 재고 IN txn + PO 상태 갱신 */
export async function receiveGoods(input: { purchaseOrderId: string; qty: number }) {
  if (input.qty <= 0) throw new Error("입고 수량은 1 이상이어야 합니다.");
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id: input.purchaseOrderId }, include: { receipts: true } });
    if (!po) throw new Error("발주를 찾을 수 없습니다.");
    grSeq += 1;
    const code = `GR-${Date.now().toString().slice(-6)}-${String(grSeq).padStart(3, "0")}`;
    const gr = await tx.goodsReceipt.create({ data: { code, purchaseOrderId: po.id, itemId: po.itemId, qty: input.qty } });
    await tx.inventoryTxn.create({ data: { itemId: po.itemId, qty: input.qty, type: "IN", ref: po.code } });
    const received = po.receipts.reduce((a, b) => a + b.qty, 0) + input.qty;
    const updated = await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: poStatusFor(po.qty, received) } });
    return { receipt: gr, purchaseOrder: updated };
  });
}
