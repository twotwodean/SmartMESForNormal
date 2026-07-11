/**
 * PLC-2: 폴러 핵심 로직(네트워크 읽기 → 디코드 → DB 적재).
 * `scripts/plc-poll.ts`(장기 실행 루프)와 `lib/plc/poller.test.ts`(통합 테스트)가 이 모듈을 사용한다.
 */
import { prisma } from "@/lib/db";
import { logError } from "@/lib/log";
import { counterDelta } from "@/lib/plc/delta";
import {
  PLC_POLL_MS,
  READ_RANGES,
  getRegistersByKind,
  runStateLabel,
  stopReasonLabel,
  type DeviceDef,
  type RegDef,
} from "@/lib/plc/datamap";
import { decodeValue } from "@/lib/plc/decode";
import type { ModbusClient } from "@/lib/plc/modbus";
import { evaluateAndTrigger } from "@/lib/services/predictive-service";
import { recordPlcProduction } from "@/lib/services/production-service";

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

/** PLC-4: 누적 델타 flush 주기(ms). 이 주기마다 pending 카운트를 활성 WO 실적으로 반영 시도한다. */
const FLUSH_MS = Number(process.env.PLC_FLUSH_MS ?? 10_000);

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

  const currGood = numField(reading, "good_count");
  const currDefect = numField(reading, "defect_count");

  // PLC-4: 이전 상태를 읽어 델타를 계산하고 pending에 누적한다(업서트 전에 조회).
  const prevState = await prisma.equipmentState.findUnique({ where: { equipmentId: equipment.id } });
  const goodDelta = counterDelta(prevState?.goodCount ?? 0, currGood);
  const defectDelta = counterDelta(prevState?.defectCount ?? 0, currDefect);

  let pendingGood = (prevState?.pendingGood ?? 0) + goodDelta;
  let pendingDefect = (prevState?.pendingDefect ?? 0) + defectDelta;
  let lastFlushAt = prevState?.lastFlushAt ?? null;

  // PLC-5: 가동/정지 누적시간(초) — 이번 폴 주기 동안의 runState를 기준으로 누적한다.
  // (offline/markOffline 시에는 데이터가 없으므로 여기서 누적하지 않는다.)
  const pollSecs = PLC_POLL_MS / 1000;
  const prevRunSecs = prevState?.runSecs ?? 0;
  const prevDownSecs = prevState?.downSecs ?? 0;
  const runSecs = runState === "RUN" ? prevRunSecs + pollSecs : prevRunSecs;
  const downSecs = runState === "RUN" ? prevDownSecs : prevDownSecs + pollSecs;

  const now = new Date();
  const dueForFlush =
    lastFlushAt === null || now.getTime() - lastFlushAt.getTime() >= FLUSH_MS;

  if (dueForFlush && pendingGood + pendingDefect > 0) {
    try {
      const outcome = await recordPlcProduction({
        equipmentCode,
        goodQty: pendingGood,
        defectQty: pendingDefect,
      });
      if (outcome.created) {
        // 활성 WO에 반영 완료 → pending 초기화, flush 시각 갱신.
        pendingGood = 0;
        pendingDefect = 0;
        lastFlushAt = now;
      }
      // created:false(활성 WO 없음)인 경우 pending은 유지(생산 손실 방지)하고
      // lastFlushAt도 갱신하지 않아 다음 주기에 즉시 재시도한다.
    } catch (err) {
      logError("plc-poller: auto-POP 귀속 실패", err, { equipmentCode, pendingGood, pendingDefect });
      // pending은 유지하여 다음 주기에 재시도한다. 폴링 루프는 계속 진행.
    }
  }

  const data = {
    runState,
    stopReason,
    goodCount: currGood,
    defectCount: currDefect,
    cycleTime: numField(reading, "cycle_time"),
    temperature: numField(reading, "temperature"),
    pressure: numField(reading, "pressure"),
    spindleRpm: Math.round(numField(reading, "spindle_rpm")),
    loadPct: Math.round(numField(reading, "load_pct")),
    online: true,
    pendingGood,
    pendingDefect,
    lastFlushAt,
    runSecs,
    downSecs,
  };

  await prisma.equipmentState.upsert({
    where: { equipmentId: equipment.id },
    create: { equipmentId: equipment.id, ...data },
    update: data,
  });

  const sampleNow = now.getTime();
  const lastSample = lastSampleAt.get(equipment.id) ?? 0;
  if (sampleNow - lastSample >= TEMP_SAMPLE_MS) {
    lastSampleAt.set(equipment.id, sampleNow);
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

  // PdM-1: 임계 규칙 평가 → 위반 시 PREDICTIVE 정비지시+알람 자동생성. 실패해도 폴링 루프는 계속 진행.
  try {
    await evaluateAndTrigger(equipmentCode, {
      temperature: data.temperature,
      loadPct: data.loadPct,
      runtimeHours: runSecs / 3600,
    });
  } catch (err) {
    logError("plc-poller: 예지보전 트리거 실패", err, { equipmentCode });
  }
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
