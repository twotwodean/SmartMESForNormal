import { describe, it, expect } from "vitest";
import { trendGeometry } from "@/components/ui/trend-chart";

describe("trendGeometry", () => {
  it("값이 2개 미만이면 null (빈/1점 상태는 컴포넌트가 평탄선으로 처리)", () => {
    expect(trendGeometry([], { width: 100, height: 40 })).toBeNull();
    expect(trendGeometry([7], { width: 100, height: 40 })).toBeNull();
  });

  it("N개 값이면 N개의 좌표 쌍과, area path에 N개의 L + 닫힘 L 커맨드를 만든다", () => {
    const points = [10, 20, 15, 30, 5];
    const geo = trendGeometry(points, { width: 200, height: 50 });
    expect(geo).not.toBeNull();
    const coordPairs = geo!.linePoints.split(" ");
    expect(coordPairs).toHaveLength(points.length);

    // area path: "M x,h L.. L.. L.. L.. L.. Lx,h Z" → L 커맨드 개수는 points.length + 1(닫힘)
    const lCommandCount = (geo!.areaPath.match(/L/g) ?? []).length;
    expect(lCommandCount).toBe(points.length + 1);
    expect(geo!.areaPath.startsWith("M")).toBe(true);
    expect(geo!.areaPath.endsWith("Z")).toBe(true);
  });

  it("min/max 미지정 시 데이터 범위 기준으로 패딩을 두고 자동 계산한다", () => {
    const geo = trendGeometry([10, 20, 30], { width: 100, height: 40 });
    expect(geo).not.toBeNull();
    expect(geo!.min).toBeLessThan(10);
    expect(geo!.max).toBeGreaterThan(30);
  });

  it("모든 값이 같아도(범위 0) 최소 패딩을 적용해 나눗셈 오류 없이 계산한다", () => {
    const geo = trendGeometry([5, 5, 5], { width: 100, height: 40 });
    expect(geo).not.toBeNull();
    expect(geo!.max).toBeGreaterThan(geo!.min);
    expect(Number.isFinite(geo!.min)).toBe(true);
    expect(Number.isFinite(geo!.max)).toBe(true);
  });

  it("min/max를 명시하면 그대로 사용한다", () => {
    const geo = trendGeometry([10, 20], { width: 100, height: 40, min: 0, max: 100 });
    expect(geo!.min).toBe(0);
    expect(geo!.max).toBe(100);
  });
});
