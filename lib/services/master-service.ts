import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ItemType } from "@/lib/domain/types";

function dupError(): never { throw new Error("이미 존재하는 코드입니다."); }
function inUse(what: string): never { throw new Error(`사용 중이라 삭제할 수 없습니다: ${what}`); }
function isP2002(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// ---------- Item ----------
export interface ItemRow { id: string; code: string; name: string; type: ItemType; uom: string; safetyStock: number; }
export async function listItems(): Promise<ItemRow[]> {
  const rows = await prisma.item.findMany({ orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type as ItemType, uom: r.uom, safetyStock: r.safetyStock }));
}
export async function createItem(input: { code: string; name: string; type: ItemType; uom: string; safetyStock: number }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 품목명은 필수입니다.");
  if (input.safetyStock < 0) throw new Error("안전재고는 음수일 수 없습니다.");
  try { return await prisma.item.create({ data: input }); }
  catch (e) { if (isP2002(e)) dupError(); throw e; }
}
export async function updateItem(id: string, input: { name?: string; type?: ItemType; uom?: string; safetyStock?: number }) {
  if (input.safetyStock != null && input.safetyStock < 0) throw new Error("안전재고는 음수일 수 없습니다.");
  return prisma.item.update({ where: { id }, data: input });
}
export async function deleteItem(id: string) {
  const [bomP, bomC, routings, plans, wos, lots, txns, insp, po, gr, so, sh, con, models, docs] = await Promise.all([
    prisma.bomComponent.count({ where: { parentId: id } }),
    prisma.bomComponent.count({ where: { childId: id } }),
    prisma.routing.count({ where: { itemId: id } }),
    prisma.productionPlan.count({ where: { itemId: id } }),
    prisma.workOrder.count({ where: { itemId: id } }),
    prisma.lot.count({ where: { itemId: id } }),
    prisma.inventoryTxn.count({ where: { itemId: id } }),
    prisma.inspection.count({ where: { itemId: id } }),
    prisma.purchaseOrder.count({ where: { itemId: id } }),
    prisma.goodsReceipt.count({ where: { itemId: id } }),
    prisma.salesOrder.count({ where: { itemId: id } }),
    prisma.shipment.count({ where: { itemId: id } }),
    prisma.concession.count({ where: { itemId: id } }),
    prisma.productModel.count({ where: { itemId: id } }),
    prisma.documentRev.count({ where: { itemId: id } }),
  ]);
  const total = bomP + bomC + routings + plans + wos + lots + txns + insp + po + gr + so + sh + con + models + docs;
  if (total > 0) inUse("BOM·주문·재고·검사 등에서 참조됨");
  return prisma.item.delete({ where: { id } });
}

// ---------- WorkCenter ----------
export interface WorkCenterRow { id: string; code: string; name: string; }
export async function listWorkCenters(): Promise<WorkCenterRow[]> {
  const rows = await prisma.workCenter.findMany({ orderBy: { code: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name }));
}
export async function createWorkCenter(input: { code: string; name: string }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 이름은 필수입니다.");
  try { return await prisma.workCenter.create({ data: input }); }
  catch (e) { if (isP2002(e)) dupError(); throw e; }
}
export async function updateWorkCenter(id: string, input: { name?: string }) {
  return prisma.workCenter.update({ where: { id }, data: input });
}
export async function deleteWorkCenter(id: string) {
  const [eq, steps, wos] = await Promise.all([
    prisma.equipment.count({ where: { workCenterId: id } }),
    prisma.routingStep.count({ where: { workCenterId: id } }),
    prisma.workOrder.count({ where: { workCenterId: id } }),
  ]);
  if (eq + steps + wos > 0) inUse("설비·라우팅·작업지시에서 참조됨");
  return prisma.workCenter.delete({ where: { id } });
}

// ---------- ProcessStage ----------
export interface ProcessStageRow { id: string; code: string; name: string; seq: number; }
export async function listProcessStages(): Promise<ProcessStageRow[]> {
  const rows = await prisma.processStage.findMany({ orderBy: { seq: "asc" } });
  return rows.map((r) => ({ id: r.id, code: r.code, name: r.name, seq: r.seq }));
}
export async function createProcessStage(input: { code: string; name: string; seq: number }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("코드와 이름은 필수입니다.");
  try { return await prisma.processStage.create({ data: input }); }
  catch (e) { if (isP2002(e)) dupError(); throw e; }
}
export async function updateProcessStage(id: string, input: { name?: string; seq?: number }) {
  return prisma.processStage.update({ where: { id }, data: input });
}
export async function deleteProcessStage(id: string) {
  const steps = await prisma.routingStep.count({ where: { processStageId: id } });
  if (steps > 0) inUse("라우팅 공정에서 참조됨");
  return prisma.processStage.delete({ where: { id } });
}
