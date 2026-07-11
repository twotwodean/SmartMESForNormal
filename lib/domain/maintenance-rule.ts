// PdM-1: 예지보전 임계 규칙 평가(순수 함수). MaintenanceRule 레코드를 입력으로 받아
// 텔레메트리 리딩(reading)과 비교, 위반(Breach) 목록을 반환한다. DB/IO는 여기서 하지 않는다.

export interface RuleDef {
  id: string;
  equipmentId: string | null;
  signal: string;
  op: "GT" | "GTE" | "LT" | "LTE";
  threshold: number;
  severity: "warn" | "crit";
  active: boolean;
  description?: string | null;
}

export interface RuleReading {
  temperature?: number | null;
  loadPct?: number | null;
  runtimeHours?: number | null;
}

export interface Breach {
  ruleId: string;
  signal: string;
  value: number;
  threshold: number;
  severity: "warn" | "crit";
  message: string;
}

function signalValue(reading: RuleReading, signal: string): number | null | undefined {
  switch (signal) {
    case "temperature":
      return reading.temperature;
    case "load_pct":
      return reading.loadPct;
    case "runtime_hours":
      return reading.runtimeHours;
    default:
      return undefined;
  }
}

function compare(value: number, op: RuleDef["op"], threshold: number): boolean {
  switch (op) {
    case "GT":
      return value > threshold;
    case "GTE":
      return value >= threshold;
    case "LT":
      return value < threshold;
    case "LTE":
      return value <= threshold;
    default:
      return false;
  }
}

const OP_LABEL: Record<RuleDef["op"], string> = {
  GT: ">",
  GTE: ">=",
  LT: "<",
  LTE: "<=",
};

const SIGNAL_LABEL: Record<string, string> = {
  temperature: "온도",
  load_pct: "부하율",
  runtime_hours: "누적가동시간",
};

/** reading을 활성 규칙들에 대해 평가하고, 위반한 규칙들의 Breach 목록을 반환한다. */
export function evaluateRules(reading: RuleReading, rules: RuleDef[]): Breach[] {
  const breaches: Breach[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    const value = signalValue(reading, rule.signal);
    if (value === null || value === undefined) continue;
    if (!compare(value, rule.op, rule.threshold)) continue;

    breaches.push({
      ruleId: rule.id,
      signal: rule.signal,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      message: `${SIGNAL_LABEL[rule.signal] ?? rule.signal} ${value.toFixed(1)} ${OP_LABEL[rule.op]} 임계 ${rule.threshold} (예지경보)`,
    });
  }
  return breaches;
}
