/**
 * PLC-2: Modbus/TCP 시뮬레이터(서버).
 * `lib/plc/datamap.ts`(SSOT)가 정의한 레지스터 맵을 그대로 노출하여, 실 PLC 없이
 * 폴러(scripts/plc-poll.ts)를 end-to-end로 검증할 수 있게 한다.
 *
 * 실행: npm run plc:sim (env PLC_HOST/PLC_PORT로 바인딩 주소 조정)
 * 운영 전환 시에는 이 스크립트를 실 PLC로 대체하고 poller의 env만 바꾸면 된다.
 */
import { ServerTCP, type IServiceVector } from "modbus-serial";

import { DEVICES, PLC_HOST, PLC_PORT } from "@/lib/plc/datamap";
import { buildRegisterWords, findRegisterAt } from "@/lib/plc/encode";
import { logger } from "@/lib/log";

interface UnitState {
  run_state: number;
  good_count: number;
  defect_count: number;
  cycle_time: number; // seconds
  target_qty: number;
  stop_reason: number;
  op_mode: number;
  temperature: number; // ℃
  pressure: number; // MPa
  spindle_rpm: number;
  load_pct: number;
  run_command: boolean;
  reset_command: boolean;
  estop: boolean;
  door_open: boolean;
  cycle_complete: boolean;
}

function initialState(): UnitState {
  return {
    run_state: 1, // RUN
    good_count: 0,
    defect_count: 0,
    cycle_time: 15,
    target_qty: 1000,
    stop_reason: 0,
    op_mode: 0,
    temperature: 35,
    pressure: 8,
    spindle_rpm: 1500,
    load_pct: 60,
    run_command: false,
    reset_command: false,
    estop: false,
    door_open: false,
    cycle_complete: false,
  };
}

const states = new Map<number, UnitState>(DEVICES.map((d) => [d.unitId, initialState()]));

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 1초 tick: 현실적인 상태 변동(가동/정지/알람, 카운터 증가, 센서 흔들림) */
function tick(state: UnitState): void {
  if (state.run_state === 3) {
    // ALARM: 가끔 리셋되어 STOP으로 복귀(실제 리셋 지령 없이도 시뮬레이션 진행을 위해)
    if (Math.random() < 0.3) {
      state.run_state = 0;
      state.stop_reason = 5; // 고장
      state.estop = false;
    }
  } else {
    const r = Math.random();
    if (r < 0.02) {
      state.run_state = 3; // ALARM (희귀)
      state.stop_reason = 0;
      state.estop = Math.random() < 0.5;
    } else if (r < 0.1) {
      state.run_state = 2; // IDLE (간헐)
      state.stop_reason = 0;
    } else if (r < 0.15) {
      state.run_state = 0; // STOP (간헐)
      state.stop_reason = 1 + Math.floor(Math.random() * 6);
    } else {
      state.run_state = 1; // RUN (대부분)
      state.stop_reason = 0;
    }
  }

  if (state.run_state === 1) {
    state.good_count += 1 + Math.floor(Math.random() * 3);
    if (Math.random() < 0.05) state.defect_count += 1;
    state.cycle_time = 10 + Math.random() * 10; // 10.0~20.0s
    state.spindle_rpm = Math.round(1500 + (Math.random() - 0.5) * 400);
    state.load_pct = Math.round(40 + Math.random() * 50);
    state.cycle_complete = Math.random() < 0.3; // 펄스
    state.door_open = false;
  } else {
    state.cycle_complete = false;
    state.door_open = state.run_state !== 3 && Math.random() < 0.05;
  }

  state.temperature = clamp(state.temperature + (Math.random() - 0.5) * 3, 20, 60);
  state.pressure = clamp(state.pressure + (Math.random() - 0.5) * 0.6, 5, 12);
}

function valuesFor(state: UnitState): Record<string, number> {
  return {
    run_state: state.run_state,
    good_count: state.good_count,
    defect_count: state.defect_count,
    cycle_time: state.cycle_time,
    target_qty: state.target_qty,
    stop_reason: state.stop_reason,
    op_mode: state.op_mode,
    temperature: state.temperature,
    pressure: state.pressure,
    spindle_rpm: state.spindle_rpm,
    load_pct: state.load_pct,
  };
}

function getBoolField(state: UnitState, key: string): boolean {
  switch (key) {
    case "run_command":
      return state.run_command;
    case "reset_command":
      return state.reset_command;
    case "estop":
      return state.estop;
    case "door_open":
      return state.door_open;
    case "cycle_complete":
      return state.cycle_complete;
    default:
      return false;
  }
}

function setBoolField(state: UnitState, key: string, value: boolean): void {
  if (key === "run_command") state.run_command = value;
  else if (key === "reset_command") {
    state.reset_command = value;
    if (value && state.run_state === 3) {
      // 알람 리셋 지령: 즉시 STOP으로 복귀
      state.run_state = 0;
      state.stop_reason = 0;
      state.estop = false;
    }
  }
}

function requireState(unitID: number): UnitState {
  const state = states.get(unitID);
  if (!state) throw new Error(`알 수 없는 unitID: ${unitID}`);
  return state;
}

const vector: IServiceVector = {
  getMultipleHoldingRegisters: (addr: number, length: number, unitID: number): number[] => {
    const words = buildRegisterWords("HOLDING", valuesFor(requireState(unitID)));
    return words.slice(addr, addr + length);
  },
  getHoldingRegister: (addr: number, unitID: number): number => {
    const words = buildRegisterWords("HOLDING", valuesFor(requireState(unitID)));
    return words[addr] ?? 0;
  },
  getMultipleInputRegisters: (addr: number, length: number, unitID: number): number[] => {
    const words = buildRegisterWords("INPUT", valuesFor(requireState(unitID)));
    return words.slice(addr, addr + length);
  },
  getInputRegister: (addr: number, unitID: number): number => {
    const words = buildRegisterWords("INPUT", valuesFor(requireState(unitID)));
    return words[addr] ?? 0;
  },
  getCoil: (addr: number, unitID: number): boolean => {
    const def = findRegisterAt("COIL", addr);
    if (!def) return false;
    return getBoolField(requireState(unitID), def.key);
  },
  getDiscreteInput: (addr: number, unitID: number): boolean => {
    const def = findRegisterAt("DISCRETE", addr);
    if (!def) return false;
    return getBoolField(requireState(unitID), def.key);
  },
  setCoil: (addr: number, value: boolean, unitID: number): void => {
    const def = findRegisterAt("COIL", addr);
    if (!def) return;
    setBoolField(requireState(unitID), def.key, value);
  },
};

const server = new ServerTCP(vector, { host: PLC_HOST, port: PLC_PORT, debug: false });

server.on("initialized", () => {
  logger.info("plc-sim listening", { host: PLC_HOST, port: PLC_PORT, units: DEVICES.map((d) => d.unitId) });
});
server.on("socketError", (err) => logger.warn("plc-sim socket error", { errorMessage: String(err) }));
server.on("serverError", (err) => logger.warn("plc-sim server error", { errorMessage: String(err) }));

const tickTimer = setInterval(() => {
  for (const [unitId, state] of states) {
    tick(state);
    logger.info("plc-sim tick", {
      unitId,
      runState: state.run_state,
      goodCount: state.good_count,
      defectCount: state.defect_count,
      temperature: Number(state.temperature.toFixed(1)),
    });
  }
}, 1000);

function shutdown(): void {
  logger.info("plc-sim shutting down");
  clearInterval(tickTimer);
  server.close(() => {
    logger.info("plc-sim closed");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
