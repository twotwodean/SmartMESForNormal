/**
 * Modbus 레지스터/코일 값을 `lib/plc/datamap.ts`의 정의(타입·스케일·워드순서)에 따라
 * 최종 수치/논리값으로 변환하는 순수 함수 모음. 네트워크 I/O 없음(결정적, 단위테스트 대상).
 */
import type { RegDef } from "@/lib/plc/datamap";

/** 부호 없는 16bit로 정규화(0~65535) */
export function toUint16(raw: number): number {
  return raw & 0xffff;
}

/** 16bit 부호있는 정수로 변환(음수 부호 확장) */
export function toInt16(raw: number): number {
  const u = toUint16(raw);
  return u & 0x8000 ? u - 0x10000 : u;
}

/**
 * 32bit 부호없는 정수로 결합(Big-Endian, High word first).
 * hi = 상위 레지스터(N), lo = 하위 레지스터(N+1).
 * 곱셈 기반 결합으로 32bit 비트연산의 부호 문제를 피한다(2^53 이내 정확).
 */
export function toUint32(hi: number, lo: number): number {
  return toUint16(hi) * 0x10000 + toUint16(lo);
}

/** 스케일 적용. 부동소수점 오차를 피하기 위해 소수 6자리에서 반올림한다. */
export function applyScale(raw: number, scale: number): number {
  return Math.round(raw * scale * 1e6) / 1e6;
}

/**
 * 레지스터 정의(dataType)에 따라 원시 레지스터 워드 배열을 최종 수치값으로 디코드한다.
 * - UINT16/INT16: regValues[0] 사용
 * - UINT32: regValues[0]=hi, regValues[1]=lo 사용
 * BOOL 타입은 이 함수로 디코드하지 않는다(decodeBool/decodeCoil 사용).
 */
export function decodeRegisters(regValues: number[], def: RegDef): number {
  switch (def.dataType) {
    case "UINT16":
      return applyScale(toUint16(regValues[0]), def.scale);
    case "INT16":
      return applyScale(toInt16(regValues[0]), def.scale);
    case "UINT32":
      return applyScale(toUint32(regValues[0], regValues[1]), def.scale);
    case "BOOL":
      throw new Error(`BOOL 타입은 decodeRegisters가 아니라 decodeBool/decodeCoil을 사용하세요: ${def.key}`);
    default: {
      // 모든 DataType 케이스를 위에서 처리했으므로 도달 불가(exhaustive check)
      const exhaustive: never = def.dataType;
      throw new Error(`알 수 없는 dataType: ${String(exhaustive)}`);
    }
  }
}

/** Discrete Input 등 단순 논리값 디코드(항등이지만 API 일관성을 위해 제공) */
export function decodeBool(b: boolean): boolean {
  return b;
}

/** Coil 값 디코드(항등이지만 신호 종류를 명확히 하기 위해 별도 제공) */
export function decodeCoil(bit: boolean): boolean {
  return bit;
}

/**
 * 레지스터 정의에 따라 숫자(워드 배열) 또는 논리값(coil/discrete)을 디코드하는 통합 진입점.
 * BOOL dataType이면 input은 boolean이어야 하고, 그 외에는 number[]이어야 한다.
 */
export function decodeValue(input: number[] | boolean, def: RegDef): number | boolean {
  if (def.dataType === "BOOL") {
    if (typeof input !== "boolean") {
      throw new Error(`BOOL 레지스터(${def.key})는 boolean 입력이 필요합니다.`);
    }
    return decodeBool(input);
  }
  if (typeof input === "boolean") {
    throw new Error(`${def.dataType} 레지스터(${def.key})는 number[] 입력이 필요합니다.`);
  }
  return decodeRegisters(input, def);
}
