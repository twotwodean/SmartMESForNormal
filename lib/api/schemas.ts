import { z } from "zod";

/**
 * 모든 변경(POST/PATCH) API 라우트의 요청 본문 스키마.
 * - 한국어 에러 메시지 사용
 * - 상태/타입 enum은 lib/domain/types의 유니온과 일치시킨다.
 * - 각 라우트가 현재 허용하는 형태(및 대응 서비스 시그니처)를 그대로 반영한다(동작 변경 없음).
 */

const BODY_INVALID = "요청 본문이 올바르지 않습니다.";

// ---------- Item ----------
export const ItemTypeSchema = z.enum(["FINISHED", "SEMI", "RAW", "SUB"], {
  message: "type은 FINISHED·SEMI·RAW·SUB 중 하나여야 합니다.",
});

export const ItemCreateSchema = z.object(
  {
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
    type: ItemTypeSchema,
    uom: z.string("uom이 필요합니다.").min(1, "uom이 필요합니다."),
    safetyStock: z
      .number("safetyStock은 숫자여야 합니다.")
      .int("safetyStock은 정수여야 합니다.")
      .min(0, "안전재고는 음수일 수 없습니다."),
  },
  { message: BODY_INVALID },
);

export const ItemUpdateSchema = z.object(
  {
    name: z.string().optional(),
    type: ItemTypeSchema.optional(),
    uom: z.string().optional(),
    safetyStock: z
      .number("safetyStock은 숫자여야 합니다.")
      .int("safetyStock은 정수여야 합니다.")
      .min(0, "안전재고는 음수일 수 없습니다.")
      .optional(),
  },
  { message: BODY_INVALID },
);

// ---------- WorkCenter ----------
export const WorkCenterCreateSchema = z.object(
  {
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
  },
  { message: BODY_INVALID },
);

export const WorkCenterUpdateSchema = z.object(
  { name: z.string().optional() },
  { message: BODY_INVALID },
);

// ---------- ProcessStage ----------
export const ProcessStageCreateSchema = z.object(
  {
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
    seq: z.number("seq는 숫자여야 합니다.").int("seq는 정수여야 합니다."),
  },
  { message: BODY_INVALID },
);

export const ProcessStageUpdateSchema = z.object(
  {
    name: z.string().optional(),
    seq: z.number("seq는 숫자여야 합니다.").int("seq는 정수여야 합니다.").optional(),
  },
  { message: BODY_INVALID },
);

// ---------- BOM ----------
export const BomComponentCreateSchema = z.object(
  {
    parentId: z.string("parentId가 필요합니다.").min(1, "parentId가 필요합니다."),
    childId: z.string("childId가 필요합니다.").min(1, "childId가 필요합니다."),
    qtyPer: z.number("qtyPer가 필요합니다.").positive("소요량은 0보다 커야 합니다."),
  },
  { message: BODY_INVALID },
);

export const BomComponentUpdateSchema = z.object(
  { qtyPer: z.number("qtyPer가 필요합니다.").positive("소요량은 0보다 커야 합니다.") },
  { message: BODY_INVALID },
);

// ---------- Routing ----------
export const RoutingCreateSchema = z.object(
  {
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
  },
  { message: BODY_INVALID },
);

export const RoutingStepCreateSchema = z.object(
  {
    routingId: z.string("routingId가 필요합니다.").min(1, "routingId가 필요합니다."),
    processStageId: z.string("processStageId가 필요합니다.").min(1, "processStageId가 필요합니다."),
    workCenterId: z.string().optional(),
    seq: z.number("seq는 숫자여야 합니다.").int("seq는 정수여야 합니다.").min(0, "순서는 음수일 수 없습니다."),
    stdTimeMin: z.number("stdTimeMin은 숫자여야 합니다.").min(0, "표준시간은 음수일 수 없습니다."),
  },
  { message: BODY_INVALID },
);

// ---------- SalesOrder / Shipment ----------
export const SalesOrderCreateSchema = z.object(
  {
    customerId: z.string("customerId가 필요합니다.").min(1, "customerId가 필요합니다."),
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").positive("qty는 1 이상이어야 합니다."),
    dueDate: z.string("dueDate가 필요합니다.").min(1, "dueDate가 필요합니다."),
  },
  { message: BODY_INVALID },
);

export const ShipmentCreateSchema = z.object(
  {
    salesOrderId: z.string("salesOrderId가 필요합니다.").min(1, "salesOrderId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").positive("qty는 1 이상이어야 합니다."),
  },
  { message: BODY_INVALID },
);

export const ShipmentActionSchema = z.object(
  { action: z.enum(["ship", "return"], { message: "action은 ship 또는 return여야 합니다." }) },
  { message: BODY_INVALID },
);

// ---------- Invoice / Payment ----------
export const InvoiceCreateSchema = z.object(
  {
    customerId: z.string("customerId가 필요합니다.").min(1, "customerId가 필요합니다."),
    amount: z.number("amount가 필요합니다.").int("amount는 정수여야 합니다.").positive("청구액은 1 이상이어야 합니다."),
    shipmentId: z.string().optional(),
  },
  { message: BODY_INVALID },
);

export const PaymentCreateSchema = z.object(
  {
    invoiceId: z.string("invoiceId가 필요합니다.").min(1, "invoiceId가 필요합니다."),
    amount: z.number("amount가 필요합니다.").int("amount는 정수여야 합니다.").positive("수금액은 1 이상이어야 합니다."),
  },
  { message: BODY_INVALID },
);

// ---------- PurchaseOrder / GoodsReceipt ----------
export const PurchaseOrderCreateSchema = z.object(
  {
    supplierId: z.string("supplierId가 필요합니다.").min(1, "supplierId가 필요합니다."),
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").positive("qty는 1 이상이어야 합니다."),
  },
  { message: BODY_INVALID },
);

export const GoodsReceiptCreateSchema = z.object(
  {
    purchaseOrderId: z.string("purchaseOrderId가 필요합니다.").min(1, "purchaseOrderId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").positive("입고 수량은 1 이상이어야 합니다."),
  },
  { message: BODY_INVALID },
);

// ---------- Concession ----------
export const ConcessionCreateSchema = z.object(
  {
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").positive("수량은 1 이상이어야 합니다."),
    reason: z.string("reason이 필요합니다.").min(1, "사유를 입력하세요."),
  },
  { message: BODY_INVALID },
);

export const ConcessionActionSchema = z.object(
  { action: z.enum(["approve", "reject"], { message: "action은 approve 또는 reject여야 합니다." }) },
  { message: BODY_INVALID },
);

// ---------- ProductModel / Document ----------
export const ProductModelCreateSchema = z.object(
  {
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
    spec: z.string().optional(),
  },
  { message: BODY_INVALID },
);

export const DocumentCreateSchema = z.object(
  {
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
    rev: z.string().optional(),
    note: z.string().optional(),
    itemId: z.string().optional(),
  },
  { message: BODY_INVALID },
);

// ---------- Quality ----------
export const InspectionTypeSchema = z.enum(["RECEIVING", "PROCESS", "SHIPPING"], {
  message: "type은 RECEIVING·PROCESS·SHIPPING 중 하나여야 합니다.",
});
export const InspectionResultSchema = z.enum(["PASS", "FAIL", "SPECIAL"], {
  message: "result는 PASS·FAIL·SPECIAL 중 하나여야 합니다.",
});

export const InspectionCreateSchema = z.object(
  {
    type: InspectionTypeSchema,
    result: InspectionResultSchema,
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").min(0, "수량은 음수일 수 없습니다."),
    defectQty: z
      .number("defectQty는 숫자여야 합니다.")
      .int("defectQty는 정수여야 합니다.")
      .min(0, "수량은 음수일 수 없습니다.")
      .optional()
      .default(0),
  },
  { message: BODY_INVALID },
);

// ---------- Production ----------
export const ProductionResultCreateSchema = z.object(
  {
    workOrderId: z.string("workOrderId가 필요합니다.").min(1, "workOrderId가 필요합니다."),
    goodQty: z.number("goodQty가 필요합니다.").int("goodQty는 정수여야 합니다.").min(0, "수량은 음수일 수 없습니다."),
    defectQty: z
      .number("defectQty는 숫자여야 합니다.")
      .int("defectQty는 정수여야 합니다.")
      .min(0, "수량은 음수일 수 없습니다.")
      .optional(),
    downtimeMin: z
      .number("downtimeMin은 숫자여야 합니다.")
      .int("downtimeMin은 정수여야 합니다.")
      .min(0, "downtimeMin은 음수일 수 없습니다.")
      .optional(),
    operatorId: z.string("operatorId는 문자열이어야 합니다.").optional(),
    shiftId: z.string("shiftId는 문자열이어야 합니다.").optional(),
    downtimeReasonId: z.string("downtimeReasonId는 문자열이어야 합니다.").optional(),
  },
  { message: BODY_INVALID },
);

// ---------- Maintenance ----------
export const MaintenanceTypeSchema = z.enum(["REPAIR", "PREVENTIVE"], {
  message: "type은 REPAIR 또는 PREVENTIVE여야 합니다.",
});

export const MaintenanceOrderCreateSchema = z.object(
  {
    equipmentId: z.string("equipmentId가 필요합니다.").min(1, "equipmentId가 필요합니다."),
    type: MaintenanceTypeSchema,
    description: z.string().optional(),
  },
  { message: BODY_INVALID },
);

export const MaintenanceActionSchema = z.object(
  { action: z.enum(["start", "finish"], { message: "action은 start 또는 finish여야 합니다." }) },
  { message: BODY_INVALID },
);

// ---------- Inventory ----------
export const InventoryTxnTypeSchema = z.enum(["IN", "OUT", "MOVE", "ADJUST", "PRODUCE", "CONSUME"], {
  message: "type이 올바르지 않습니다.",
});

export const InventoryTxnCreateSchema = z.object(
  {
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    type: InventoryTxnTypeSchema,
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다."),
    ref: z.string().optional(),
  },
  { message: BODY_INVALID },
);

// ---------- WorkOrder ----------
export const WorkOrderCreateSchema = z.object(
  {
    itemId: z.string("itemId가 필요합니다.").min(1, "itemId가 필요합니다."),
    qty: z.number("qty가 필요합니다.").int("qty는 정수여야 합니다.").positive("qty는 1 이상이어야 합니다."),
    workCenterId: z.string().optional(),
  },
  { message: BODY_INVALID },
);

export const WorkOrderStatusSchema = z.enum(["WAITING", "RUNNING", "DONE", "CANCELLED"], {
  message: "status가 올바르지 않습니다.",
});

export const WorkOrderUpdateSchema = z.object(
  { status: WorkOrderStatusSchema },
  { message: BODY_INVALID },
);

// ---------- Operator ----------
export const OperatorCreateSchema = z.object(
  {
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
    active: z.boolean().optional(),
  },
  { message: BODY_INVALID },
);

export const OperatorUpdateSchema = z.object(
  {
    name: z.string().optional(),
    active: z.boolean().optional(),
  },
  { message: BODY_INVALID },
);

// ---------- Shift ----------
export const ShiftCreateSchema = z.object(
  {
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    name: z.string("name이 필요합니다.").min(1, "name이 필요합니다."),
  },
  { message: BODY_INVALID },
);

export const ShiftUpdateSchema = z.object(
  { name: z.string().optional() },
  { message: BODY_INVALID },
);

// ---------- DowntimeReason ----------
export const DowntimeCategorySchema = z.enum(["PLANNED", "UNPLANNED"], {
  message: "category는 PLANNED 또는 UNPLANNED여야 합니다.",
});

export const DowntimeReasonCreateSchema = z.object(
  {
    code: z.string("code가 필요합니다.").min(1, "code가 필요합니다."),
    label: z.string("label이 필요합니다.").min(1, "label이 필요합니다."),
    category: DowntimeCategorySchema,
  },
  { message: BODY_INVALID },
);

export const DowntimeReasonUpdateSchema = z.object(
  {
    label: z.string().optional(),
    category: DowntimeCategorySchema.optional(),
  },
  { message: BODY_INVALID },
);

// ---------- Auth ----------
export const LoginSchema = z.object(
  {
    username: z.string("아이디와 비밀번호를 입력하세요.").min(1, "아이디와 비밀번호를 입력하세요."),
    password: z.string("아이디와 비밀번호를 입력하세요.").min(1, "아이디와 비밀번호를 입력하세요."),
  },
  { message: "아이디와 비밀번호를 입력하세요." },
);
