import { describe, it, expect } from "vitest";
import { evaluateRules, type RuleDef } from "@/lib/domain/maintenance-rule";

function rule(overrides: Partial<RuleDef> = {}): RuleDef {
  return {
    id: "r1",
    equipmentId: null,
    signal: "temperature",
    op: "GT",
    threshold: 55,
    severity: "warn",
    active: true,
    ...overrides,
  };
}

describe("evaluateRules", () => {
  it("GT 위반 시 Breach를 반환한다", () => {
    const breaches = evaluateRules({ temperature: 60 }, [rule()]);
    expect(breaches).toHaveLength(1);
    expect(breaches[0].signal).toBe("temperature");
    expect(breaches[0].value).toBe(60);
    expect(breaches[0].message).toContain("60.0");
    expect(breaches[0].message).toContain(">");
  });

  it("임계 미만이면 위반 없음", () => {
    const breaches = evaluateRules({ temperature: 40 }, [rule()]);
    expect(breaches).toHaveLength(0);
  });

  it("값이 null/undefined면 규칙을 건너뛴다", () => {
    expect(evaluateRules({ temperature: null }, [rule()])).toHaveLength(0);
    expect(evaluateRules({}, [rule()])).toHaveLength(0);
  });

  it("비활성 규칙은 건너뛴다", () => {
    const breaches = evaluateRules({ temperature: 100 }, [rule({ active: false })]);
    expect(breaches).toHaveLength(0);
  });

  it("LT 연산자도 지원한다", () => {
    const breaches = evaluateRules(
      { loadPct: 5 },
      [rule({ signal: "load_pct", op: "LT", threshold: 10 })],
    );
    expect(breaches).toHaveLength(1);
    expect(breaches[0].signal).toBe("load_pct");
  });

  it("severity가 Breach에 그대로 전달된다", () => {
    const breaches = evaluateRules({ temperature: 60 }, [rule({ severity: "crit" })]);
    expect(breaches[0].severity).toBe("crit");
  });

  it("여러 규칙 중 위반한 것만 반환한다", () => {
    const breaches = evaluateRules(
      { temperature: 60, loadPct: 50 },
      [rule(), rule({ id: "r2", signal: "load_pct", threshold: 90 })],
    );
    expect(breaches).toHaveLength(1);
    expect(breaches[0].ruleId).toBe("r1");
  });
});
