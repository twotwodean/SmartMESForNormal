/**
 * PLC-2: 폴러 실행 스크립트(장기 실행 루프).
 * 시뮬레이터(scripts/plc-simulator.ts) 또는 실 PLC에 접속해 PLC_POLL_MS 주기로 모든 DEVICES를 읽어
 * EquipmentState/PlcReading/Alarm으로 적재한다. 운영 전환: PLC_HOST/PLC_PORT(env)만 교체.
 *
 * 실행:
 *   npm run plc:poll                  # 반복 폴링(SIGINT/SIGTERM로 종료)
 *   PLC_POLL_ONCE=1 npm run plc:poll  # 각 장비 1회씩 폴링 후 종료(테스트/CI용)
 */
import { DEVICES, PLC_HOST, PLC_PORT, PLC_POLL_MS, PLC_TIMEOUT_MS } from "@/lib/plc/datamap";
import { logError, logger } from "@/lib/log";
import { closeModbusClient, connectModbusClient, type ModbusClient } from "@/lib/plc/modbus";
import { ingest, markOffline, pollOnce } from "@/lib/plc/poller";
import { checkDuePreventive } from "@/lib/services/predictive-service";

const ONCE = process.env.PLC_POLL_ONCE === "1" || process.argv.includes("--once");

async function pollAllDevices(client: ModbusClient): Promise<void> {
  for (const device of DEVICES) {
    try {
      const reading = await pollOnce(client, device);
      await ingest(reading, device.equipmentCode);
      logger.info("plc-poll ok", {
        equipmentCode: device.equipmentCode,
        unitId: device.unitId,
        runState: reading.run_state,
        goodCount: reading.good_count,
        temperature: reading.temperature,
      });
    } catch (err) {
      logError("plc-poll: 장비 읽기 실패, offline 표기", err, { equipmentCode: device.equipmentCode, unitId: device.unitId });
      try {
        await markOffline(device.equipmentCode);
      } catch (offlineErr) {
        logError("plc-poll: offline 표기 실패", offlineErr, { equipmentCode: device.equipmentCode });
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** PdM-1: 폴 사이클당 1회, 시간기반 예방정비 만기 여부를 확인해 자동생성한다. 실패해도 폴링 루프는 계속 진행. */
async function runDuePreventiveCheck(): Promise<void> {
  try {
    const { created } = await checkDuePreventive(new Date());
    if (created > 0) {
      logger.info("plc-poll: 정기 예방정비 자동생성", { created });
    }
  } catch (err) {
    logError("plc-poll: 정기 예방정비 확인 실패", err);
  }
}

async function main(): Promise<void> {
  const client = await connectModbusClient(PLC_HOST, PLC_PORT, PLC_TIMEOUT_MS);
  logger.info("plc-poll connected", { host: PLC_HOST, port: PLC_PORT, once: ONCE, intervalMs: PLC_POLL_MS });

  if (ONCE) {
    await pollAllDevices(client);
    await runDuePreventiveCheck();
    closeModbusClient(client);
    logger.info("plc-poll one-shot done");
    return;
  }

  let stopping = false;
  const shutdown = (): void => {
    if (stopping) return;
    stopping = true;
    logger.info("plc-poll shutting down");
    closeModbusClient(client);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (!stopping) {
    await pollAllDevices(client);
    await runDuePreventiveCheck();
    await sleep(PLC_POLL_MS);
  }
}

main().catch((err) => {
  logError("plc-poll: 치명적 오류", err);
  process.exit(1);
});
