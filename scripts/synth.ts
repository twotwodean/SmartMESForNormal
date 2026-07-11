/**
 * 실 규모 합성 데이터 생성기.
 *
 * 기존 seed 데이터 위에 SYN- 접두어를 붙인 합성 데이터를 대량으로 추가한다.
 * env로 규모를 조절하며, 모두 batched createMany(1,000건 단위)로 삽입한다.
 *
 * 실행: `npm run db:synth` 또는
 *   SYNTH_ITEMS=100 DATABASE_URL="file:./some.db" npx tsx scripts/synth.ts
 *
 * ⚠️ 경고: 기본값(품목 2,000 / 수불 50,000 / 작업지시 2,000 / 수주 1,000)으로 실행하면
 * 상당한 시간이 걸리고 DB 용량이 커진다. 운영/개발 DB(dev.db)가 아닌 사본 DB에
 * DATABASE_URL을 지정해 실행하는 것을 권장한다.
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;

const SYNTH_ITEMS = Number(process.env.SYNTH_ITEMS ?? 2000);
const SYNTH_TXNS = Number(process.env.SYNTH_TXNS ?? 50000);
const SYNTH_WORK_ORDERS = Number(process.env.SYNTH_WORK_ORDERS ?? 2000);
const SYNTH_SALES_ORDERS = Number(process.env.SYNTH_SALES_ORDERS ?? 1000);

// 스키마 주석 기준 실제 union 값
const ITEM_TYPES = ["RAW", "SEMI", "FINISHED", "SUB"] as const;
const UOMS = ["EA", "kg", "m", "L"] as const;
const TXN_TYPES = ["IN", "OUT", "CONSUME"] as const;
const WORK_ORDER_STATUSES = ["WAITING", "RUNNING", "DONE", "CANCELLED"] as const;
const SALES_ORDER_STATUSES = ["ORDERED", "PRODUCING", "SHIPPED", "CANCELLED"] as const;

interface CreatedItemRef {
  id: string;
  code: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/** 가중치: IN 60% / OUT 20% / CONSUME 20% — 파생재고가 대체로 양수 유지되도록 IN 비중↑ */
function weightedTxnType(): (typeof TXN_TYPES)[number] {
  const r = Math.random();
  if (r < 0.6) return "IN";
  if (r < 0.8) return "OUT";
  return "CONSUME";
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** 배치 단위(BATCH_SIZE)로 나눠 순차 삽입 */
async function createInBatches<T>(
  data: T[],
  fn: (batch: T[]) => Promise<unknown>,
  batchSize: number = BATCH_SIZE,
): Promise<number> {
  let created = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await fn(batch);
    created += batch.length;
  }
  return created;
}

async function ensureSupplier(type: "SUPPLIER" | "CUSTOMER", prefix: string, name: string): Promise<string> {
  const existing = await prisma.supplier.findFirst({ where: { type } });
  if (existing) return existing.id;
  const created = await prisma.supplier.create({
    data: { code: `${prefix}-SYN-001`, name, type },
  });
  return created.id;
}

async function main(): Promise<void> {
  console.warn(
    "⚠️  WARNING: 이 스크립트는 대량의 합성 데이터를 생성합니다. dev.db 등 운영/개발 DB가 아닌 사본 DB(DATABASE_URL)에 대해 실행하는 것을 권장합니다.",
  );

  const startedAt = Date.now();
  const summary: Record<string, number> = {};

  // ── 거래처: 기존 seed supplier/customer 재사용, 없으면 SYN- 접두어로 생성 ──
  const supplierId = await ensureSupplier("SUPPLIER", "SUP", "SYN 합성 공급처");
  const customerId = await ensureSupplier("CUSTOMER", "CUS", "SYN 합성 고객");

  // ── Item ──
  const itemCodes: string[] = [];
  const itemData: Prisma.ItemCreateManyInput[] = [];
  for (let i = 0; i < SYNTH_ITEMS; i++) {
    const code = `SYN-ITEM-${pad(i, 6)}`;
    itemCodes.push(code);
    itemData.push({
      code,
      name: `합성품목 ${pad(i, 6)}`,
      type: randChoice(ITEM_TYPES),
      uom: randChoice(UOMS),
      safetyStock: randInt(0, 500),
    });
  }
  summary.items = await createInBatches(itemData, (batch) => prisma.item.createMany({ data: batch }));

  // 생성된 SYN 품목의 id를 code 순으로 조회(이후 배치에서 FK로 사용)
  const items: CreatedItemRef[] = await prisma.item.findMany({
    where: { code: { startsWith: "SYN-ITEM-" } },
    select: { id: true, code: true },
    orderBy: { code: "asc" },
  });

  // ── BomComponent: 2단계 BOM. parentIndex < childIndex (자기참조/순환 방지) ──
  const bomTarget = Math.min(3000, items.length * 2);
  const bomSeen = new Set<string>();
  const bomData: Prisma.BomComponentCreateManyInput[] = [];
  let bomAttempts = 0;
  while (bomData.length < bomTarget && bomAttempts < bomTarget * 10 && items.length > 1) {
    bomAttempts++;
    const parentIndex = randInt(0, items.length - 2);
    const childIndex = randInt(parentIndex + 1, items.length - 1);
    const parent = items[parentIndex];
    const child = items[childIndex];
    const key = `${parent.id}:${child.id}`;
    if (bomSeen.has(key)) continue;
    bomSeen.add(key);
    bomData.push({ parentId: parent.id, childId: child.id, qtyPer: randInt(1, 5) });
  }
  summary.bomComponents = await createInBatches(bomData, (batch) => prisma.bomComponent.createMany({ data: batch }));

  // ── InventoryTxn: IN 60% / OUT 20% / CONSUME 20% ──
  const txnData: Prisma.InventoryTxnCreateManyInput[] = [];
  for (let i = 0; i < SYNTH_TXNS; i++) {
    const item = randChoice(items);
    const type = weightedTxnType();
    const magnitude = randInt(1, 200);
    const qty = type === "IN" ? magnitude : -magnitude;
    txnData.push({ itemId: item.id, qty, type, ref: `SYN-TXN-${pad(i, 7)}` });
  }
  summary.inventoryTxns = await createInBatches(txnData, (batch) => prisma.inventoryTxn.createMany({ data: batch }));

  // ── WorkOrder ──
  const woData: Prisma.WorkOrderCreateManyInput[] = [];
  for (let i = 0; i < SYNTH_WORK_ORDERS; i++) {
    const item = randChoice(items);
    woData.push({
      code: `SYN-WO-${pad(i, 6)}`,
      itemId: item.id,
      qty: randInt(10, 1000),
      status: randChoice(WORK_ORDER_STATUSES),
    });
  }
  summary.workOrders = await createInBatches(woData, (batch) => prisma.workOrder.createMany({ data: batch }));

  // ── SalesOrder ──
  const soData: Prisma.SalesOrderCreateManyInput[] = [];
  for (let i = 0; i < SYNTH_SALES_ORDERS; i++) {
    const item = randChoice(items);
    soData.push({
      code: `SYN-SO-${pad(i, 6)}`,
      customerId,
      itemId: item.id,
      qty: randInt(1, 500),
      status: randChoice(SALES_ORDER_STATUSES),
      dueDate: new Date(Date.now() + randInt(-10, 60) * 86_400_000),
    });
  }
  summary.salesOrders = await createInBatches(soData, (batch) => prisma.salesOrder.createMany({ data: batch }));

  const elapsedMs = Date.now() - startedAt;

  console.log("합성 데이터 생성 완료 (SYN- 접두어)");
  console.log(`  supplierId(재사용/생성): ${supplierId}`);
  console.log(`  customerId(재사용/생성): ${customerId}`);
  console.log(`  items: ${summary.items}`);
  console.log(`  bomComponents: ${summary.bomComponents}`);
  console.log(`  inventoryTxns: ${summary.inventoryTxns}`);
  console.log(`  workOrders: ${summary.workOrders}`);
  console.log(`  salesOrders: ${summary.salesOrders}`);
  console.log(`  elapsedMs: ${elapsedMs}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
