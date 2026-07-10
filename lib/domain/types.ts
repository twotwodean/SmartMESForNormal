export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";
export type ItemType = "FINISHED" | "SEMI" | "RAW" | "SUB";
export type WorkOrderStatus = "WAITING" | "RUNNING" | "DONE" | "CANCELLED";
export type LotStatus = "CREATED" | "IN_PROGRESS" | "INSPECTED" | "PASSED" | "FAILED" | "SHIPPED";
export type InventoryTxnType = "IN" | "OUT" | "MOVE" | "ADJUST" | "PRODUCE" | "CONSUME";
export type StockStatus = "NORMAL" | "BELOW" | "NEGATIVE";
