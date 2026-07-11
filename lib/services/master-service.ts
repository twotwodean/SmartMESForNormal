import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ItemType } from "@/lib/domain/types";
import { wouldCreateCycle, type BomLink } from "@/lib/domain/bom";

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

// ---------- BOM ----------
export interface BomChildRow { id: string; childId: string; childCode: string; childName: string; qtyPer: number; }
export async function listBom(parentId: string): Promise<BomChildRow[]> {
  const rows = await prisma.bomComponent.findMany({ where: { parentId }, include: { child: true }, orderBy: { child: { code: "asc" } } });
  return rows.map((r) => ({ id: r.id, childId: r.childId, childCode: r.child.code, childName: r.child.name, qtyPer: r.qtyPer }));
}
export async function addBomComponent(input: { parentId: string; childId: string; qtyPer: number }) {
  if (input.qtyPer <= 0) throw new Error("소요량은 0보다 커야 합니다.");
  const links = (await prisma.bomComponent.findMany({ select: { parentId: true, childId: true, qtyPer: true } })) as BomLink[];
  if (wouldCreateCycle(input.parentId, input.childId, links)) throw new Error("순환 BOM은 등록할 수 없습니다.");
  try { return await prisma.bomComponent.create({ data: input }); }
  catch (e) { if (isP2002(e)) throw new Error("이미 등록된 하위 품목입니다."); throw e; }
}
export async function updateBomQty(id: string, qtyPer: number) {
  if (qtyPer <= 0) throw new Error("소요량은 0보다 커야 합니다.");
  return prisma.bomComponent.update({ where: { id }, data: { qtyPer } });
}
export async function removeBomComponent(id: string) { return prisma.bomComponent.delete({ where: { id } }); }

// ---------- Routing ----------
export interface RoutingStepRow { id: string; seq: number; processStageId: string; processName: string; workCenterId: string | null; workCenterName: string | null; stdTimeMin: number; }
export interface RoutingRow { id: string; itemId: string; name: string; steps: RoutingStepRow[]; }
export async function listRoutings(itemId: string): Promise<RoutingRow[]> {
  const rows = await prisma.routing.findMany({
    where: { itemId },
    include: { steps: { include: { processStage: true, workCenter: true }, orderBy: { seq: "asc" } } },
  });
  return rows.map((r) => ({
    id: r.id, itemId: r.itemId, name: r.name,
    steps: r.steps.map((s) => ({
      id: s.id, seq: s.seq, processStageId: s.processStageId, processName: s.processStage.name,
      workCenterId: s.workCenterId, workCenterName: s.workCenter?.name ?? null, stdTimeMin: s.stdTimeMin,
    })),
  }));
}
export async function createRouting(input: { itemId: string; name: string }) {
  if (!input.name.trim()) throw new Error("라우팅 이름은 필수입니다.");
  return prisma.routing.create({ data: input });
}
export async function deleteRouting(id: string) {
  await prisma.routingStep.deleteMany({ where: { routingId: id } });
  return prisma.routing.delete({ where: { id } });
}
export async function addRoutingStep(input: { routingId: string; processStageId: string; workCenterId?: string; seq: number; stdTimeMin: number }) {
  if (input.seq < 0 || input.stdTimeMin < 0) throw new Error("순서·표준시간은 음수일 수 없습니다.");
  return prisma.routingStep.create({ data: { routingId: input.routingId, processStageId: input.processStageId, workCenterId: input.workCenterId ?? null, seq: input.seq, stdTimeMin: input.stdTimeMin } });
}
export async function removeRoutingStep(id: string) { return prisma.routingStep.delete({ where: { id } }); }
