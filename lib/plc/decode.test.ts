import { describe, it, expect } from "vitest";
import { decodeRegisters, decodeBool, decodeCoil, decodeValue, applyScale, toInt16, toUint32 } from "@/lib/plc/decode";
import { getRegisterByKey } from "@/lib/plc/datamap";

function reg(key: string) {
  const def = getRegisterByKey(key);
  if (!def) throw new Error(`register not found: ${key}`);
  return def;
}

describe("decodeRegisters", () => {
  it("UINT16: op_mode 원시값 1 -> 1 (스케일 1)", () => {
    expect(decodeRegisters([1], reg("op_mode"))).toBe(1);
  });

  it("INT16: 음수 온도 -23.5℃ (raw uint16 65301 -> int16 -235, scale 0.1)", () => {
    expect(toInt16(65301)).toBe(-235);
    expect(decodeRegisters([65301], reg("temperature"))).toBe(-23.5);
  });

  it("INT16: 양수 온도 raw 235 scale 0.1 -> 23.5", () => {
    expect(decodeRegisters([235], reg("temperature"))).toBe(23.5);
  });

  it("UINT32: good_count hi=1,lo=5000 결합(빅엔디안, 상위워드 우선) -> 70536", () => {
    expect(toUint32(1, 5000)).toBe(70536);
    expect(decodeRegisters([1, 5000], reg("good_count"))).toBe(70536);
  });

  it("UINT16 + scale: pressure raw 1013 scale 0.01 -> 10.13", () => {
    expect(decodeRegisters([1013], reg("pressure"))).toBe(10.13);
  });

  it("applyScale: 부동소수점 오차 없이 반올림", () => {
    expect(applyScale(1013, 0.01)).toBe(10.13);
    expect(applyScale(235, 0.1)).toBe(23.5);
  });

  it("BOOL: decodeBool/decodeCoil은 항등 함수", () => {
    expect(decodeBool(true)).toBe(true);
    expect(decodeBool(false)).toBe(false);
    expect(decodeCoil(true)).toBe(true);
  });

  it("decodeValue: BOOL 정의(estop)는 boolean 입력을 디코드", () => {
    expect(decodeValue(true, reg("estop"))).toBe(true);
  });

  it("decodeValue: 숫자 정의(cycle_time)는 number[] 입력을 디코드", () => {
    expect(decodeValue([125], reg("cycle_time"))).toBe(12.5);
  });

  it("decodeRegisters: BOOL 타입에 사용하면 에러", () => {
    expect(() => decodeRegisters([1], reg("run_command"))).toThrow();
  });

  it("decodeValue: 타입 불일치 시 에러", () => {
    expect(() => decodeValue([1], reg("estop"))).toThrow();
    expect(() => decodeValue(true, reg("cycle_time"))).toThrow();
  });
});
