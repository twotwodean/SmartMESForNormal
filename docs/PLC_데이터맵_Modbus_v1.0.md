# PLC ↔ MES 데이터 인터페이스 맵 (Modbus/TCP) v1.0

> 목적: PLC와 SmartMES 간 설비 데이터 자동 수집을 위한 **모드버스 레지스터 번지 맵(단일 진실원)**.
> 이 문서의 맵은 코드 `lib/plc/datamap.ts`와 1:1로 일치하며, **PLC 시뮬레이터(Modbus TCP 서버)** 와 **폴러(클라이언트)** 가 동일 정의를 참조한다.
> 프로토콜: **Modbus/TCP** · 폴링 주기 기본 1000ms.

---

## 1. 연결 정보

| 항목 | 값(기본/개발) | 비고 |
|---|---|---|
| 프로토콜 | Modbus/TCP | |
| 호스트 | `127.0.0.1` | 시뮬레이터 로컬 |
| 포트 | `5020` | 운영 PLC는 표준 502 |
| Unit ID(슬레이브) | 장비별 부여 | 아래 §2 |
| 폴링 주기 | 1000 ms | env `PLC_POLL_MS` |
| 타임아웃 | 2000 ms | 미응답 시 해당 장비 OFFLINE |
| 32bit 워드 순서 | **Big-Endian, High word first** (레지스터 N=상위, N+1=하위) | |
| 바이트 순서 | Big-Endian (Modbus 표준) | |

## 2. 장비 ↔ Unit ID 매핑

| Unit ID | 설비 코드 | 설비명 | 작업장 |
|---|---|---|---|
| 1 | `EQ-CNC-03` | CNC-03 | WC-CNC1 |
| 2 | `EQ-ASM-01` | 조립기-01 | WC-ASM1 |

> 각 Unit은 동일한 레지스터 레이아웃(§3~§6)을 노출한다. 장비 추가 시 Unit ID만 늘린다.

## 3. Holding Registers — 읽기 FC03 / 쓰기 FC06·FC16 (Modicon 4xxxx)

> 프로토콜 주소 = (Modicon 번지 − 40001). 예: 40001 → 주소 0.

| Modicon | 주소 | 워드 | 타입 | 신호 key | 스케일 | 단위 | 설명 |
|---|---|---|---|---|---|---|---|
| 40001 | 0 | 1 | UINT16 | `run_state` | 1 | enum | 운전상태 0=정지 1=가동 2=대기 3=알람 |
| 40002 | 1 | 2 | UINT32 | `good_count` | 1 | ea | 누적 양품수(40002 상위, 40003 하위) |
| 40004 | 3 | 2 | UINT32 | `defect_count` | 1 | ea | 누적 불량수(40004 상위, 40005 하위) |
| 40006 | 5 | 1 | UINT16 | `cycle_time` | 0.1 | s | 최근 사이클 타임 |
| 40007 | 6 | 1 | UINT16 | `target_qty` | 1 | ea | 목표 수량 |
| 40008 | 7 | 1 | UINT16 | `stop_reason` | 1 | enum | 정지사유 코드(§7) |
| 40009 | 8 | 1 | UINT16 | `op_mode` | 1 | enum | 0=자동 1=수동 |

## 4. Input Registers — 읽기 FC04 (Modicon 3xxxx, 센서 읽기전용)

> 프로토콜 주소 = (Modicon 번지 − 30001).

| Modicon | 주소 | 타입 | 신호 key | 스케일 | 단위 | 설명 |
|---|---|---|---|---|---|---|
| 30001 | 0 | INT16 | `temperature` | 0.1 | ℃ | 스핀들/오일 온도 (음수 가능) |
| 30002 | 1 | UINT16 | `pressure` | 0.01 | MPa | 유압 |
| 30003 | 2 | UINT16 | `spindle_rpm` | 1 | rpm | 스핀들 회전수 |
| 30004 | 3 | UINT16 | `load_pct` | 1 | % | 부하율 |

## 5. Coils — 읽기 FC01 / 쓰기 FC05 (Modicon 0xxxx, 제어 출력)

> 프로토콜 주소 = (Modicon 번지 − 1).

| Modicon | 주소 | 신호 key | 설명 |
|---|---|---|---|
| 00001 | 0 | `run_command` | 운전 지령(쓰기 시 기동) |
| 00002 | 1 | `reset_command` | 알람 리셋 지령 |

## 6. Discrete Inputs — 읽기 FC02 (Modicon 1xxxx, 상태 입력)

> 프로토콜 주소 = (Modicon 번지 − 10001).

| Modicon | 주소 | 신호 key | 설명 |
|---|---|---|---|
| 10001 | 0 | `estop` | 비상정지 활성 |
| 10002 | 1 | `door_open` | 안전도어 열림 |
| 10003 | 2 | `cycle_complete` | 사이클 완료 펄스 |

## 7. 코드표

**run_state (40001)**: `0 STOP(정지)` · `1 RUN(가동)` · `2 IDLE(대기)` · `3 ALARM(알람)`
**stop_reason (40008)**: `0 없음` · `1 자재대기` · `2 공구교환` · `3 품질이상` · `4 계획정지` · `5 고장` · `6 기타`
**op_mode (40009)**: `0 자동` · `1 수동`

## 8. MES 매핑 (수집값 → SmartMES)

| PLC 신호 | MES 반영 |
|---|---|
| `run_state`, `stop_reason`, `op_mode` | `EquipmentState`(설비 실시간 상태) 업서트 |
| `good_count`, `defect_count` | `EquipmentState`에 최신 누적치 저장 + 폴 간 **델타**를 텔레메트리로 기록(작업지시 자동 실적화는 후속) |
| `temperature`, `pressure`, `spindle_rpm`, `load_pct`, `cycle_time` | `PlcReading` 시계열(선택 샘플링) + 최신값 EquipmentState |
| `run_state=3 ALARM` 또는 `estop=1` | `Alarm` 자동 생성(선택) |
| 미응답/타임아웃 | EquipmentState `online=false` |

## 9. 폴링 절차(폴러)

1. 각 Unit에 대해 FC03(HR 0~8), FC04(IR 0~3), FC01(coil 0~1), FC02(DI 0~2) 순차 읽기.
2. §3~§6 정의로 디코드(타입·스케일·워드순서 적용).
3. §8 매핑으로 `EquipmentState` 업서트 + 필요 시 `PlcReading`·`Alarm` 기록.
4. 타임아웃/에러는 로깅(`logError`) 후 해당 장비만 offline 표기, 다음 주기 계속.

## 10. 테스트(시뮬레이터)

- `npm run plc:sim` — Modbus/TCP 서버(포트 5020)가 Unit 1·2로 위 레지스터를 노출, 값이 현실적으로 변동(가동 시 good_count 증가, 간헐 불량·정지·온도 변동, 알람 토글).
- `npm run plc:poll` — 폴러가 시뮬레이터에 접속해 주기적으로 읽어 DB에 적재.
- 검증: 시뮬레이터 기동 → 폴러 수 주기 실행 → `EquipmentState`가 갱신되고 `good_count`가 증가하는지 확인.

> 운영 전환: 호스트/포트/Unit ID만 실 PLC 값으로 교체(env). 맵이 다르면 §3~§7과 `lib/plc/datamap.ts`만 수정하면 된다.
