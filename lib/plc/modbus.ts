/**
 * `modbus-serial` 클라이언트(ModbusRTU)를 위한 얇은 타입 래퍼.
 * 라이브러리 자체가 `index.d.ts`에 타입을 제공하지만(v8), 연결 절차(connectTCP → setID → setTimeout)를
 * 한 곳에 모아 폴러(scripts/plc-poll.ts)와 테스트(lib/plc/poller.test.ts)가 재사용하도록 한다.
 */
import ModbusRTU from "modbus-serial";

export type ModbusClient = ModbusRTU;

/** TCP로 접속한 뒤 곧바로 사용 가능한 클라이언트를 반환한다(unit ID는 호출부에서 setID로 지정). */
export async function connectModbusClient(host: string, port: number, timeoutMs: number): Promise<ModbusClient> {
  const client = new ModbusRTU();
  await client.connectTCP(host, { port });
  client.setTimeout(timeoutMs);
  return client;
}

/** 열려 있으면 안전하게 닫는다(중복 호출/미연결 상태에서도 예외 없이 동작). */
export function closeModbusClient(client: ModbusClient): void {
  if (client.isOpen) {
    client.close(() => undefined);
  }
}
