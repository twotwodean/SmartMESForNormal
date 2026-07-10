import { prisma } from "@/lib/db";
import type { SalesOrderStatus, ShipmentStatus } from "@/lib/domain/types";

export interface SalesOrderRow {
  id: string; code: string; customerName: string; itemName: string;
  qty: number; status: SalesOrderStatus; dueDate: string;
}
export async function listSalesOrders(): Promise<SalesOrderRow[]> {
  const rows = await prisma.salesOrder.findMany({ include: { customer: true, item: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, code: r.code, customerName: r.customer.name, itemName: r.item.name,
    qty: r.qty, status: r.status as SalesOrderStatus, dueDate: r.dueDate.toISOString(),
  }));
}

let soSeq = 0;
export async function createSalesOrder(input: { customerId: string; itemId: string; qty: number; dueDate: string }) {
  soSeq += 1;
  const code = `SO-${Date.now().toString().slice(-6)}-${String(soSeq).padStart(3, "0")}`;
  return prisma.salesOrder.create({ data: { code, customerId: input.customerId, itemId: input.itemId, qty: input.qty, dueDate: new Date(input.dueDate), status: "ORDERED" } });
}

export interface ShipmentRow {
  id: string; code: string; itemName: string; qty: number; status: ShipmentStatus;
  salesOrderCode: string | null; shippedAt: string | null;
}
export async function listShipments(): Promise<ShipmentRow[]> {
  const rows = await prisma.shipment.findMany({ include: { item: true, salesOrder: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id, code: r.code, itemName: r.item.name, qty: r.qty, status: r.status as ShipmentStatus,
    salesOrderCode: r.salesOrder?.code ?? null, shippedAt: r.shippedAt?.toISOString() ?? null,
  }));
}

let shSeq = 0;
export async function createShipment(input: { salesOrderId: string; qty: number }) {
  const so = await prisma.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } });
  shSeq += 1;
  const code = `SH-${Date.now().toString().slice(-6)}-${String(shSeq).padStart(3, "0")}`;
  return prisma.shipment.create({ data: { code, salesOrderId: so.id, itemId: so.itemId, qty: input.qty, status: "REQUESTED" } });
}

/** 출하등록: Shipment SHIPPED + shippedAt + 완제품 재고 OUT */
export async function shipShipment(id: string) {
  return prisma.$transaction(async (tx) => {
    const sh = await tx.shipment.findUnique({ where: { id } });
    if (!sh) throw new Error("출하를 찾을 수 없습니다.");
    if (sh.status !== "REQUESTED") throw new Error("이미 처리된 출하입니다.");
    await tx.inventoryTxn.create({ data: { itemId: sh.itemId, qty: -sh.qty, type: "OUT", ref: sh.code } });
    return tx.shipment.update({ where: { id }, data: { status: "SHIPPED", shippedAt: new Date() } });
  });
}

/** 반품: Shipment RETURNED + 재고 IN 복원 */
export async function returnShipment(id: string) {
  return prisma.$transaction(async (tx) => {
    const sh = await tx.shipment.findUnique({ where: { id } });
    if (!sh) throw new Error("출하를 찾을 수 없습니다.");
    if (sh.status !== "SHIPPED") throw new Error("출하 완료건만 반품 가능합니다.");
    await tx.inventoryTxn.create({ data: { itemId: sh.itemId, qty: sh.qty, type: "IN", ref: `${sh.code}-RET` } });
    return tx.shipment.update({ where: { id }, data: { status: "RETURNED" } });
  });
}
