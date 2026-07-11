import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  // 멱등: 기존 데이터 정리(개발 seed)
  await prisma.documentRev.deleteMany();
  await prisma.productModel.deleteMany();
  await prisma.concession.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.alarm.deleteMany();
  await prisma.nonconformance.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.maintenanceOrder.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.defectCode.deleteMany();
  await prisma.inventoryTxn.deleteMany();
  await prisma.lotGenealogy.deleteMany();
  await prisma.productionResult.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.downtimeReason.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.routingStep.deleteMany();
  await prisma.routing.deleteMany();
  await prisma.bomComponent.deleteMany();
  await prisma.plcReading.deleteMany();
  await prisma.equipmentState.deleteMany();
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

  // 작업자
  await prisma.operator.createMany({
    data: [
      { code: "OP-001", name: "김작업" },
      { code: "OP-002", name: "이작업" },
      { code: "OP-003", name: "박작업" },
    ],
  });

  // 근무조
  await prisma.shift.createMany({
    data: [
      { code: "DAY", name: "주간" },
      { code: "NIGHT", name: "야간" },
    ],
  });

  // 정지사유(PLC stop_reason 코드표와 정렬)
  await prisma.downtimeReason.createMany({
    data: [
      { code: "DR-1", label: "자재대기", category: "UNPLANNED" },
      { code: "DR-2", label: "공구교환", category: "UNPLANNED" },
      { code: "DR-3", label: "품질이상", category: "UNPLANNED" },
      { code: "DR-4", label: "계획정지", category: "PLANNED" },
      { code: "DR-5", label: "고장", category: "UNPLANNED" },
      { code: "DR-6", label: "기타", category: "UNPLANNED" },
    ],
  });

  // 불량코드
  const defects = await Promise.all(
    [
      { code: "D-SCR", label: "스크래치" },
      { code: "D-DIM", label: "치수불량" },
      { code: "D-BUR", label: "버(Burr)" },
      { code: "D-CRK", label: "크랙" },
      { code: "D-ASM", label: "조립불량" },
    ].map((d) => prisma.defectCode.create({ data: d })),
  );

  const cnc = await prisma.equipment.findUniqueOrThrow({ where: { code: "EQ-CNC-03" } });

  // 검사(공정/출하) — fin 품목 기준
  const insp1 = await prisma.inspection.create({
    data: { type: "PROCESS", result: "PASS", itemId: fin.id, workOrderId: wo.id, qty: 100, defectQty: 3 },
  });
  await prisma.inspection.create({
    data: { type: "SHIPPING", result: "SPECIAL", itemId: fin.id, qty: 80, defectQty: 5 },
  });
  const inspFail = await prisma.inspection.create({
    data: { type: "PROCESS", result: "FAIL", itemId: fin.id, qty: 50, defectQty: 12 },
  });

  // 부적합(불량코드 연결)
  await prisma.nonconformance.create({
    data: { inspectionId: inspFail.id, defectCodeId: defects[1].id, qty: 12, action: "재작업 지시", status: "OPEN" },
  });

  // 설비 정비: 완료 1건 + 진행중 1건
  await prisma.maintenanceOrder.create({
    data: {
      equipmentId: cnc.id, type: "REPAIR", status: "DONE", description: "주축 베어링 교체",
      requestedAt: new Date("2026-07-08T09:00:00"), startedAt: new Date("2026-07-08T09:30:00"), finishedAt: new Date("2026-07-08T11:00:00"),
    },
  });
  await prisma.maintenanceOrder.create({
    data: {
      equipmentId: cnc.id, type: "REPAIR", status: "IN_PROGRESS", description: "주축 과부하 점검",
      requestedAt: new Date("2026-07-09T14:00:00"), startedAt: new Date("2026-07-09T14:20:00"),
    },
  });
  // 예방점검 스케줄
  await prisma.maintenanceSchedule.create({
    data: { equipmentId: cnc.id, intervalDays: 30, nextDate: new Date("2026-08-08") },
  });

  // 알람
  await prisma.alarm.createMany({
    data: [
      { tone: "crit", title: "CNC-03 설비 정지", message: "주축 과부하 — 정비 요청 발행됨" },
      { tone: "warn", title: "원자재 SUS-304 안전재고 미달", message: "현재고 180 / 안전 250" },
      { tone: "info", title: "WO-260709-013 완료 입고", message: "하우징 커버 800 EA" },
    ],
  });

  // 거래처
  const sup = await prisma.supplier.create({ data: { code: "SUP-001", name: "대성금속", type: "SUPPLIER" } });
  const cus = await prisma.supplier.create({ data: { code: "CUS-001", name: "한빛기계", type: "CUSTOMER" } });

  // 발주(구매)
  await prisma.purchaseOrder.create({ data: { code: "PO-2607-001", supplierId: sup.id, itemId: raw1.id, qty: 500, status: "ORDERED", orderedAt: new Date("2026-07-07") } });
  const po2 = await prisma.purchaseOrder.create({ data: { code: "PO-2607-002", supplierId: sup.id, itemId: raw2.id, qty: 300, status: "PARTIAL", orderedAt: new Date("2026-07-08") } });
  // 부분 입고(발주2)
  await prisma.goodsReceipt.create({ data: { code: "GR-2607-001", purchaseOrderId: po2.id, itemId: raw2.id, qty: 200, receivedAt: new Date("2026-07-09") } });

  // 수주(영업) + 출하요청
  const so = await prisma.salesOrder.create({ data: { code: "SO-2607-001", customerId: cus.id, itemId: fin.id, qty: 200, status: "ORDERED", dueDate: new Date("2026-07-20") } });
  const shipment = await prisma.shipment.create({ data: { code: "SH-2607-001", salesOrderId: so.id, itemId: fin.id, qty: 120, status: "REQUESTED" } });

  // 특채
  await prisma.concession.create({ data: { itemId: fin.id, qty: 5, reason: "치수 경미 초과(고객 승인 요청)", status: "REQUESTED" } });

  // 모델/문서
  await prisma.productModel.create({ data: { itemId: fin.id, code: "PM-GB2500-A", name: "GB-2500 표준형", spec: "감속비 1:25" } });
  await prisma.documentRev.create({ data: { itemId: fin.id, name: "GB-2500 조립도", rev: "B", note: "베어링 사양 변경" } });

  // 매출(청구)·수금
  const invoice = await prisma.invoice.create({
    data: { code: "INV-2607-001", customerId: cus.id, shipmentId: shipment.id, amount: 1_200_000, status: "PARTIAL" },
  });
  await prisma.payment.create({ data: { invoiceId: invoice.id, amount: 500_000 } });

  console.log(
    "seed 완료: 사용자 3, 품목 4, 작업장 2, 공정 3, Routing 1, 계획 1, WO 1, Lot 2, 재고txn 5, 작업자 3, 근무조 2, 정지사유 6, 불량코드 5, 검사 3, 부적합 1, 정비 2+1, 알람 3, 거래처 2, 발주 2, 입고 1, 수주 1, 출하 1, 특채 1, 모델 1, 문서 1, 청구 1, 수금 1",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
