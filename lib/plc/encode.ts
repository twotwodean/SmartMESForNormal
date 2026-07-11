/**
 * `lib/plc/decode.ts`의 역변환(엔지니어링 값 → Modbus 레지스터 워드).
 * PLC-2 시뮬레이터(scripts/plc-simulator.ts)가 실제 PLC처럼 레지스터 워드를 생성할 때 사용한다.
 * 순수 함수 모음. 네트워크 I/O 없음(결정적, 단위테스트 대상).
 */
import { REGISTERS, getRegistersByKind, getReadRange, type RegDef, type RegKind } from "@/lib/plc/datamap";

/** 정수를 부호없는 16bit 워드로 정규화(반올림 후 0~65535로 래핑) */
export function toRawUint16(value: number): number {
  return Math.round(value) & 0xffff;
}

/** 부호있는 16bit 정수(-32768~32767)를 와이어 상의 부호없는 16bit 워드로 변환(2의 보수) */
export function fromInt16ToRaw(value: number): number {
  const v = Math.round(value);
  return v < 0 ? (v + 0x10000) & 0xffff : v & 0xffff;
}

/**
 * 음이 아닌 정수를 32bit(hi, lo) 워드 쌍으로 분리(Big-Endian, High word first).
 * `toUint32`(decode.ts)의 역변환.
 */
export function splitUint32(value: number): [number, number] {
  const v = Math.max(0, Math.round(value));
  const hi = Math.floor(v / 0x10000) & 0xffff;
  const lo = v & 0xffff;
  return [hi, lo];
}

/**
 * 엔지니어링 값(스케일 적용 전 실수치)을 레지스터 정의에 따라 원시 워드 배열로 인코딩한다.
 * `decodeRegisters`의 역변환. BOOL 타입은 이 함수의 대상이 아니다(코일/디스크리트는 boolean 그대로 사용).
 */
export function encodeRegisters(value: number, def: RegDef): number[] {
  const raw = value / def.scale;
  switch (def.dataType) {
    case "UINT16":
      return [toRawUint16(raw)];
    case "INT16":
      return [fromInt16ToRaw(raw)];
    case "UINT32":
      return splitUint32(raw);
    case "BOOL":
      throw new Error(`BOOL 타입은 encodeRegisters 대상이 아닙니다: ${def.key}`);
    default: {
      // 모든 DataType 케이스를 위에서 처리했으므로 도달 불가(exhaustive check)
      const exhaustive: never = def.dataType;
      throw new Error(`알 수 없는 dataType: ${String(exhaustive)}`);
    }
  }
}

/**
 * 특정 kind(HOLDING/INPUT)의 신호 키→엔지니어링 값 맵을 받아, 해당 kind의 전체 읽기 범위(`getReadRange`)를
 * 채우는 원시 워드 배열을 만든다. 정의되지 않은 주소는 0으로 채운다.
 * 시뮬레이터의 `getMultipleHoldingRegisters`/`getMultipleInputRegisters` 구현에 사용.
 */
export function buildRegisterWords(kind: RegKind, valuesByKey: Record<string, number>): number[] {
  const regs = getRegistersByKind(kind);
  const range = getReadRange(kind);
  const words = new Array<number>(range.count).fill(0);
  for (const def of regs) {
    const value = valuesByKey[def.key];
    if (value === undefined) continue;
    const encoded = encodeRegisters(value, def);
    const offset = def.address - range.start;
    encoded.forEach((w, i) => {
      words[offset + i] = w;
    });
  }
  return words;
}

/** kind + 0-based 주소로 레지스터 정의를 찾는다(COIL/DISCRETE 등 1워드 신호 조회용). */
export function findRegisterAt(kind: RegKind, address: number): RegDef | undefined {
  return REGISTERS.find((r) => r.kind === kind && r.address === address);
}
