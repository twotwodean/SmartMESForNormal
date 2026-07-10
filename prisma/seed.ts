import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  // 멱등: 기존 데이터 정리(개발 seed)
  await prisma.inventoryTxn.deleteMany();
  await prisma.lotGenealogy.deleteMany();
  await prisma.productionResult.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.routingStep.deleteMany();
  await prisma.routing.deleteMany();
  await prisma.bomComponent.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.processStage.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash: hashPassword("admin123"), name: "관리자", role: "ADMIN" },
      { username: "operator", passwordHash: hashPassword("oper123"), name: "김현장", role: "OPERATOR" },
      { username: "viewer", passwordHash: hashPassword("view123"), name: "이조회", role: "VIEWER" },
    ],
  });

  const raw1 = await prisma.item.create({ data: { code: "RM-SUS304", name: "환봉 SUS-304 Ø50", type: "RAW", uom: "kg", safetyStock: 250 } });
  const raw2 = await prisma.item.create({ data: { code: "RM-AL6061", name: "알루미늄 6061", type: "RAW", uom: "kg", safetyStock: 100 } });
  const semi = await prisma.item.create({ data: { code: "SF-SHAFT", name: "샤프트 SUS-304", type: "SEMI", uom: "EA", safetyStock: 50 } });
  const fin = await prisma.item.create({ data: { code: "FG-GB2500", name: "기어박스 GB-2500", type: "FINISHED", uom: "EA", safetyStock: 50 } });

  await prisma.bomComponent.createMany({
    data: [
      { parentId: fin.id, childId: semi.id, qtyPer: 2 },
      { parentId: semi.id, childId: raw1.id, qtyPer: 3 },
    ],
  });

  const wcCnc = await prisma.workCenter.create({ data: { code: "WC-CNC1", name: "CNC 1라인" } });
  const wcAsm = await prisma.workCenter.create({ data: { code: "WC-ASM1", name: "조립 1라인" } });
  await prisma.equipment.createMany({
    data: [
      { code: "EQ-CNC-03", name: "CNC-03", workCenterId: wcCnc.id },
      { code: "EQ-ASM-01", name: "조립기-01", workCenterId: wcAsm.id },
    ],
  });
  const psCut = await prisma.processStage.create({ data: { code: "PS-CUT", name: "절단", seq: 1 } });
  const psMac = await prisma.processStage.create({ data: { code: "PS-MAC", name: "가공", seq: 2 } });
  const psAsm = await prisma.processStage.create({ data: { code: "PS-ASM", name: "조립", seq: 3 } });

  const routing = await prisma.routing.create({ data: { itemId: fin.id, name: "기본" } });
  await prisma.routingStep.createMany({
    data: [
      { routingId: routing.id, processStageId: psCut.id, workCenterId: wcCnc.id, seq: 1, stdTimeMin: 5 },
      { routingId: routing.id, processStageId: psMac.id, workCenterId: wcCnc.id, seq: 2, stdTimeMin: 12 },
      { routingId: routing.id, processStageId: psAsm.id, workCenterId: wcAsm.id, seq: 3, stdTimeMin: 8 },
    ],
  });

  const plan = await prisma.productionPlan.create({ data: { code: "PP-2607-001", itemId: fin.id, qty: 300, planDate: new Date("2026-07-14") } });
  const wo = await prisma.workOrder.create({ data: { code: "WO-260709-011", planId: plan.id, itemId: fin.id, qty: 300, status: "WAITING", workCenterId: wcAsm.id } });
  const lotRaw = await prisma.lot.create({ data: { code: "LOT-2600701", itemId: raw1.id, qty: 1200, status: "PASSED" } });
  const lotSemi = await prisma.lot.create({ data: { code: "LOT-2600712", itemId: semi.id, workOrderId: wo.id, qty: 450, status: "IN_PROGRESS" } });
  await prisma.lotGenealogy.create({ data: { parentLotId: lotRaw.id, childLotId: lotSemi.id } });

  await prisma.inventoryTxn.createMany({
    data: [
      { itemId: raw1.id, lotId: lotRaw.id, qty: 1200, type: "IN", ref: "GR-INIT" },
      { itemId: raw1.id, qty: -1020, type: "CONSUME", ref: "WO-260709-011" },
      { itemId: raw2.id, qty: 300, type: "IN", ref: "GR-INIT" },
      { itemId: semi.id, lotId: lotSemi.id, qty: 450, type: "PRODUCE", ref: "WO-260709-011" },
      { itemId: fin.id, qty: 120, type: "PRODUCE", ref: "WO-PREV" },
    ],
  });

  console.log("seed 완료: 사용자 3, 품목 4, 작업장 2, 공정 3, Routing 1, 계획 1, WO 1, Lot 2, 재고txn 5");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
