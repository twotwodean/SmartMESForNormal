/**
 * PLC ↔ MES 데이터 인터페이스 맵 (Modbus/TCP) — 단일 진실원(SSOT)
 *
 * 이 파일은 `docs/PLC_데이터맵_Modbus_v1.0.md` §1~§7과 1:1로 일치해야 한다.
 * 문서가 바뀌면 이 파일만 수정하면 시뮬레이터(PLC-2)·폴러(PLC-2)가 함께 갱신된다.
 *
 * 워드 순서: 32bit(UINT32)는 Big-Endian, High word first
 *   (레지스터 N = 상위 워드, N+1 = 하위 워드).
 */

export type RegKind = "HOLDING" | "INPUT" | "COIL" | "DISCRETE";
export type DataType = "UINT16" | "INT16" | "UINT32" | "BOOL";

export interface RegDef {
  key: string; // e.g. "run_state"
  kind: RegKind;
  address: number; // 0-based protocol address (Modicon 번지 - 기준값)
  words: number; // 1 or 2
  dataType: DataType;
  scale: number; // e.g. 0.1
  label: string; // Korean
  unit?: string;
}

export interface DeviceDef {
  unitId: number;
  equipmentCode: string;
}

/** §2 장비 ↔ Unit ID 매핑 */
export const DEVICES: DeviceDef[] = [
  { unitId: 1, equipmentCode: "EQ-CNC-03" },
  { unitId: 2, equipmentCode: "EQ-ASM-01" },
];

/** §3 Holding Registers — 읽기 FC03 / 쓰기 FC06·FC16 (Modicon 4xxxx) */
const HOLDING_REGISTERS: RegDef[] = [
  { key: "run_state", kind: "HOLDING", address: 0, words: 1, dataType: "UINT16", scale: 1, label: "운전상태", unit: "enum" },
  { key: "good_count", kind: "HOLDING", address: 1, words: 2, dataType: "UINT32", scale: 1, label: "누적 양품수", unit: "ea" },
  { key: "defect_count", kind: "HOLDING", address: 3, words: 2, dataType: "UINT32", scale: 1, label: "누적 불량수", unit: "ea" },
  { key: "cycle_time", kind: "HOLDING", address: 5, words: 1, dataType: "UINT16", scale: 0.1, label: "최근 사이클 타임", unit: "s" },
  { key: "target_qty", kind: "HOLDING", address: 6, words: 1, dataType: "UINT16", scale: 1, label: "목표 수량", unit: "ea" },
  { key: "stop_reason", kind: "HOLDING", address: 7, words: 1, dataType: "UINT16", scale: 1, label: "정지사유 코드", unit: "enum" },
  { key: "op_mode", kind: "HOLDING", address: 8, words: 1, dataType: "UINT16", scale: 1, label: "운전모드", unit: "enum" },
];

/** §4 Input Registers — 읽기 FC04 (Modicon 3xxxx, 센서 읽기전용) */
const INPUT_REGISTERS: RegDef[] = [
  { key: "temperature", kind: "INPUT", address: 0, words: 1, dataType: "INT16", scale: 0.1, label: "스핀들/오일 온도", unit: "℃" },
  { key: "pressure", kind: "INPUT", address: 1, words: 1, dataType: "UINT16", scale: 0.01, label: "유압", unit: "MPa" },
  { key: "spindle_rpm", kind: "INPUT", address: 2, words: 1, dataType: "UINT16", scale: 1, label: "스핀들 회전수", unit: "rpm" },
  { key: "load_pct", kind: "INPUT", address: 3, words: 1, dataType: "UINT16", scale: 1, label: "부하율", unit: "%" },
];

/** §5 Coils — 읽기 FC01 / 쓰기 FC05 (Modicon 0xxxx, 제어 출력) */
const COILS: RegDef[] = [
  { key: "run_command", kind: "COIL", address: 0, words: 1, dataType: "BOOL", scale: 1, label: "운전 지령(쓰기 시 기동)" },
  { key: "reset_command", kind: "COIL", address: 1, words: 1, dataType: "BOOL", scale: 1, label: "알람 리셋 지령" },
];

/** §6 Discrete Inputs — 읽기 FC02 (Modicon 1xxxx, 상태 입력) */
const DISCRETE_INPUTS: RegDef[] = [
  { key: "estop", kind: "DISCRETE", address: 0, words: 1, dataType: "BOOL", scale: 1, label: "비상정지 활성" },
  { key: "door_open", kind: "DISCRETE", address: 1, words: 1, dataType: "BOOL", scale: 1, label: "안전도어 열림" },
  { key: "cycle_complete", kind: "DISCRETE", address: 2, words: 1, dataType: "BOOL", scale: 1, label: "사이클 완료 펄스" },
];

/** 전체 레지스터 정의(§3~§6) */
export const REGISTERS: RegDef[] = [...HOLDING_REGISTERS, ...INPUT_REGISTERS, ...COILS, ...DISCRETE_INPUTS];

/** kind별 조회 헬퍼 */
export function getRegistersByKind(kind: RegKind): RegDef[] {
  return REGISTERS.filter((r) => r.kind === kind);
}

export function getRegisterByKey(key: string): RegDef | undefined {
  return REGISTERS.find((r) => r.key === key);
}

/** kind별 연속 읽기 범위(폴러가 FC03/04/01/02 한 번에 읽을 때 사용) */
export interface ReadRange {
  kind: RegKind;
  start: number;
  count: number; // 워드/비트 개수 합
}

export function getReadRange(kind: RegKind): ReadRange {
  const regs = getRegistersByKind(kind);
  const start = regs.length > 0 ? Math.min(...regs.map((r) => r.address)) : 0;
  const end = regs.length > 0 ? Math.max(...regs.map((r) => r.address + r.words)) : 0;
  return { kind, start, count: end - start };
}

export const READ_RANGES: ReadRange[] = ["HOLDING", "INPUT", "COIL", "DISCRETE"].map((k) => getReadRange(k as RegKind));

/** §7 코드표: run_state (40001) */
export const RUN_STATE = { 0: "STOP", 1: "RUN", 2: "IDLE", 3: "ALARM" } as const;
export type RunStateCode = keyof typeof RUN_STATE;

export function runStateLabel(code: number): string {
  return (RUN_STATE as Record<number, string>)[code] ?? "UNKNOWN";
}

/** §7 코드표: stop_reason (40008) */
export const STOP_REASON = {
  0: "없음",
  1: "자재대기",
  2: "공구교환",
  3: "품질이상",
  4: "계획정지",
  5: "고장",
  6: "기타",
} as const;
export type StopReasonCode = keyof typeof STOP_REASON;

export function stopReasonLabel(code: number): string {
  return (STOP_REASON as Record<number, string>)[code] ?? "알수없음";
}

/** §7 코드표: op_mode (40009) */
export const OP_MODE = { 0: "자동", 1: "수동" } as const;
export type OpModeCode = keyof typeof OP_MODE;

export function opModeLabel(code: number): string {
  return (OP_MODE as Record<number, string>)[code] ?? "UNKNOWN";
}

/** §1 연결 정보 */
export const PLC_HOST = process.env.PLC_HOST ?? "127.0.0.1";
export const PLC_PORT = Number(process.env.PLC_PORT ?? 5020);
export const PLC_POLL_MS = Number(process.env.PLC_POLL_MS ?? 1000);
export const PLC_TIMEOUT_MS = Number(process.env.PLC_TIMEOUT_MS ?? 2000);
