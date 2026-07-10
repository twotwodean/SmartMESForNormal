// 목업/프로토타입용 정적 데이터(단일 사업장·정적). R1에서 Prisma seed로 대체 예정.

export type WorkOrderStatus = "WAITING" | "RUNNING" | "DONE" | "CANCELLED";

export interface WorkOrder {
  code: string;
  item: string;
  qty: number;
  progress: number; // 0–100
  status: WorkOrderStatus;
  center: string;
}

export const WORK_ORDERS: WorkOrder[] = [
  { code: "WO-260709-014", item: "브라켓 ASSY (RF-L)", qty: 1200, progress: 72, status: "RUNNING", center: "CNC 1라인" },
  { code: "WO-260709-013", item: "하우징 커버 M3", qty: 800, progress: 100, status: "DONE", center: "프레스 2라인" },
  { code: "WO-260709-012", item: "샤프트 SUS-304", qty: 450, progress: 38, status: "RUNNING", center: "선반 3라인" },
  { code: "WO-260709-011", item: "기어박스 GB-2500", qty: 300, progress: 0, status: "WAITING", center: "조립 1라인" },
  { code: "WO-260709-010", item: "베어링 하우징", qty: 640, progress: 100, status: "DONE", center: "CNC 1라인" },
  { code: "WO-260709-009", item: "커넥터 하네스", qty: 2000, progress: 15, status: "CANCELLED", center: "—" },
];

export function workOrderTotals(list: WorkOrder[]): Record<WorkOrderStatus, number> {
  const acc: Record<WorkOrderStatus, number> = { WAITING: 0, RUNNING: 0, DONE: 0, CANCELLED: 0 };
  for (const wo of list) acc[wo.status] += 1;
  return acc;
}

export interface Kpi {
  key: string;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  direction?: "up" | "down";
  upIsGood?: boolean;
  tone: "primary" | "ok" | "warn" | "crit" | "info" | "neutral";
  spark?: number[];
  note?: string;
}

export const KPIS: Kpi[] = [
  { key: "plan", label: "계획 대비 실적", value: "92.4", unit: "%", delta: "3.1%p", direction: "up", tone: "primary", spark: [15, 12, 14, 8, 9, 4] },
  { key: "oee", label: "설비종합효율 OEE", value: "78.4", unit: "%", delta: "1.2%p", direction: "up", tone: "ok", spark: [10, 12, 7, 9, 6, 7] },
  { key: "ppm", label: "불량 PPM", value: "3,200", delta: "420", direction: "up", upIsGood: false, tone: "warn", spark: [14, 10, 12, 8, 10, 5] },
  { key: "stock", label: "재고 경고", value: "3", unit: "건", tone: "crit", note: "안전재고 미달 2 · 음수 1" },
  { key: "equip", label: "가동 설비", value: "14", unit: "/16", tone: "info", note: "정지 1 · 수리 1" },
];

export interface Alarm {
  id: string;
  tone: "crit" | "warn" | "info";
  title: string;
  message: string;
  ago: string;
}

export const ALARMS: Alarm[] = [
  { id: "a1", tone: "crit", title: "CNC-03 설비 정지", message: "주축 과부하 — 정비 요청 발행됨", ago: "4분 전" },
  { id: "a2", tone: "warn", title: "원자재 SUS-304 안전재고 미달", message: "현재고 180 / 안전 250", ago: "22분 전" },
  { id: "a3", tone: "info", title: "WO-260709-013 완료 입고", message: "하우징 커버 800 EA → 제품창고", ago: "31분 전" },
];

export interface LineOee {
  name: string;
  oee: number; // 0–100
  tone: "ok" | "warn" | "crit";
}

export const LINES: LineOee[] = [
  { name: "CNC 1라인", oee: 86, tone: "ok" },
  { name: "프레스 2라인", oee: 81, tone: "ok" },
  { name: "선반 3라인", oee: 64, tone: "warn" },
  { name: "조립 1라인", oee: 42, tone: "crit" },
];

export type StockStatus = "NORMAL" | "BELOW" | "NEGATIVE";

export interface InventoryItem {
  code: string;
  name: string;
  qty: number;
  safety: number;
  uom: string;
  status: StockStatus;
}

export const INVENTORY: InventoryItem[] = [
  { code: "RM-SUS304", name: "환봉 SUS-304 Ø50", qty: 180, safety: 250, uom: "kg", status: "BELOW" },
  { code: "RM-BOLT-M8", name: "볼트 M8x30", qty: 90, safety: 120, uom: "EA", status: "BELOW" },
  { code: "RM-OIL-32", name: "윤활유 VG32", qty: -12, safety: 20, uom: "L", status: "NEGATIVE" },
  { code: "SF-HOUS-M3", name: "하우징 커버 M3", qty: 640, safety: 200, uom: "EA", status: "NORMAL" },
  { code: "FG-GB2500", name: "기어박스 GB-2500", qty: 120, safety: 50, uom: "EA", status: "NORMAL" },
];
