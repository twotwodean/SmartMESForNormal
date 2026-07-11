/**
 * PLC-2: 폴러 핵심 로직(네트워크 읽기 → 디코드 → DB 적재).
 * `scripts/plc-poll.ts`(장기 실행 루프)와 `lib/plc/poller.test.ts`(통합 테스트)가 이 모듈을 사용한다.
 */
import { prisma } from "@/lib/db";
import { logError } from "@/lib/log";
import {
  READ_RANGES,
  getRegistersByKind,
  runStateLabel,
  stopReasonLabel,
  type DeviceDef,
  type RegDef,
} from "@/lib/plc/datamap";
import { decodeValue } from "@/lib/plc/decode";
import type { ModbusClient } from "@/lib/plc/modbus";

/** signal key → 디코드된 값(숫자 또는 논리값)의 맵. `lib/plc/datamap.ts`의 REGISTERS.key가 키가 된다. */
export type Reading = Record<string, number | boolean>;

function decodeNumericGroup(words: number[], regs: RegDef[], rangeStart: number, out: Reading): void {
  for (const def of regs) {
    const offset = def.address - rangeStart;
    const slice = words.slice(offset, offset + def.words);
    out[def.key] = decodeValue(slice, def) as number;
  }
}

function decodeBoolGroup(bits: boolean[], regs: RegDef[], rangeStart: number, out: Reading): void {
  for (const def of regs) {
    const offset = def.address - rangeStart;
    out[def.key] = decodeValue(bits[offset], def) as boolean;
  }
}

/**
 * §9 폴링 절차: FC03(HR)/FC04(IR)/FC01(coil)/FC02(DI) 순차 읽기 후 §3~§6 정의로 디코드한다.
 * 타임아웃/에러는 여기서 잡지 않고 호출부(scripts/plc-poll.ts)로 전파한다(장비별 offline 처리를 위해).
 */
export async function pollOnce(client: ModbusClient, device: DeviceDef): Promise<Reading> {
  client.setID(device.unitId);
  const reading: Reading = {};

  const holding = READ_RANGES.find((r) => r.kind === "HOLDING");
  const input = READ_RANGES.find((r) => r.kind === "INPUT");
  const coil = READ_RANGES.find((r) => r.kind === "COIL");
  const discrete = READ_RANGES.find((r) => r.kind === "DISCRETE");

  if (holding && holding.count > 0) {
    const { data } = await client.readHoldingRegisters(holding.start, holding.count);
    decodeNumericGroup(data, getRegistersByKind("HOLDING"), holding.start, reading);
  }
  if (input && input.count > 0) {
    const { data } = await client.readInputRegisters(input.start, input.count);
    decodeNumericGroup(data, getRegistersByKind("INPUT"), input.start, reading);
  }
  if (coil && coil.count > 0) {
    const { data } = await client.readCoils(coil.start, coil.count);
    decodeBoolGroup(data, getRegistersByKind("COIL"), coil.start, reading);
  }
  if (discrete && discrete.count > 0) {
    const { data } = await client.readDiscreteInputs(discrete.start, discrete.count);
    decodeBoolGroup(data, getRegistersByKind("DISCRETE"), discrete.start, reading);
  }

  return reading;
}

const TEMP_SAMPLE_MS = 5000; // PlcReading 샘플링 스로틀(과도한 시계열 적재 방지)
const lastSampleAt = new Map<string, number>();
const lastAlarmActive = new Map<string, boolean>();

function numField(reading: Reading, key: string): number {
  const v = reading[key];
  return typeof v === "number" ? v : 0;
}

/**
 * §8 MES 매핑: 디코드된 reading을 EquipmentState에 업서트하고, 필요 시 PlcReading·Alarm을 기록한다.
 * equipmentCode → Equipment.id 해석 실패(알 수 없는 코드)는 조용히 무시하지 않고 로깅 후 반환한다.
 */
export async function ingest(reading: Reading, equipmentCode: string): Promise<void> {
  const equipment = await prisma.equipment.findUnique({ where: { code: equipmentCode } });
  if (!equipment) {
    logError("plc-poller: 알 수 없는 설비 코드", new Error(`equipment not found: ${equipmentCode}`), { equipmentCode });
    return;
  }

  const runState = runStateLabel(numField(reading, "run_state"));
  const stopReasonCode = numField(reading, "stop_reason");
  const stopReason = stopReasonCode ? stopReasonLabel(stopReasonCode) : null;

  const data = {
    runState,
    stopReason,
    goodCount: numField(reading, "good_count"),
    defectCount: numField(reading, "defect_count"),
    cycleTime: numField(reading, "cycle_time"),
    temperature: numField(reading, "temperature"),
    pressure: numField(reading, "pressure"),
    spindleRpm: Math.round(numField(reading, "spindle_rpm")),
    loadPct: Math.round(numField(reading, "load_pct")),
    online: true,
  };

  await prisma.equipmentState.upsert({
    where: { equipmentId: equipment.id },
    create: { equipmentId: equipment.id, ...data },
    update: data,
  });

  const now = Date.now();
  const lastSample = lastSampleAt.get(equipment.id) ?? 0;
  if (now - lastSample >= TEMP_SAMPLE_MS) {
    lastSampleAt.set(equipment.id, now);
    await prisma.plcReading.create({
      data: { equipmentId: equipment.id, signal: "temperature", value: data.temperature },
    });
  }

  const isAlarm = runState === "ALARM" || reading.estop === true;
  const wasActive = lastAlarmActive.get(equipment.id) ?? false;
  if (isAlarm && !wasActive) {
    await prisma.alarm.create({
      data: {
        tone: "crit",
        title: `${equipmentCode} 알람 발생`,
        message: `runState=${runState}, stopReason=${stopReason ?? "-"}, estop=${String(reading.estop === true)}`,
      },
    });
  }
  lastAlarmActive.set(equipment.id, isAlarm);
}

/** 읽기 타임아웃/에러 시 해당 장비만 offline으로 표기(§9-4). 다음 주기는 계속 진행된다. */
export async function markOffline(equipmentCode: string): Promise<void> {
  const equipment = await prisma.equipment.findUnique({ where: { code: equipmentCode } });
  if (!equipment) {
    logError("plc-poller: 알 수 없는 설비 코드(offline 표기 실패)", new Error(`equipment not found: ${equipmentCode}`), {
      equipmentCode,
    });
    return;
  }
  await prisma.equipmentState.upsert({
    where: { equipmentId: equipment.id },
    create: { equipmentId: equipment.id, online: false },
    update: { online: false },
  });
}
