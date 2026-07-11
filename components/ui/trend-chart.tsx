import * as React from "react";

import { cn } from "@/lib/utils";

const AUTO_RANGE_PADDING_RATIO = 0.1;
const MIN_AUTO_PADDING = 1;

export interface TrendGeometryOpts {
  width: number;
  height: number;
  min?: number;
  max?: number;
}

export interface TrendGeometry {
  /** `<polyline points>`에 그대로 사용하는 "x,y x,y ..." 문자열 */
  linePoints: string;
  /** 라인 아래 채움 영역을 그리는 `<path d>` 문자열(닫힌 폴리곤) */
  areaPath: string;
  min: number;
  max: number;
  mid: number;
}

/**
 * 값 배열을 SVG 좌표(폴리라인 + 영역 채움 path)로 변환한다(y축 반전).
 * min/max를 지정하지 않으면 데이터 범위 + 여유 패딩으로 자동 계산한다.
 * 값이 2개 미만이면 그릴 좌표가 없으므로 null을 반환한다(빈/평탄 상태 처리는 컴포넌트 쪽에서).
 */
export function trendGeometry(points: number[], opts: TrendGeometryOpts): TrendGeometry | null {
  if (points.length < 2) return null;
  const { width, height } = opts;

  const dataMin = Math.min(...points);
  const dataMax = Math.max(...points);
  const span = dataMax - dataMin;
  const pad = span === 0 ? Math.max(Math.abs(dataMax) * AUTO_RANGE_PADDING_RATIO, MIN_AUTO_PADDING) : span * AUTO_RANGE_PADDING_RATIO;

  const min = opts.min ?? dataMin - pad;
  const max = opts.max ?? dataMax + pad;
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * height,
  }));

  const linePoints = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const last = coords[coords.length - 1];
  const areaPath =
    `M${coords[0].x.toFixed(2)},${height} ` +
    coords.map((c) => `L${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ") +
    ` L${last.x.toFixed(2)},${height} Z`;

  return { linePoints, areaPath, min, max, mid: (min + max) / 2 };
}

export interface TrendChartProps {
  /** 시간순으로 누적된 값 배열(가장 최근 값이 마지막). */
  points: number[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  unit?: string;
  /** CSS 색상 값 또는 변수(예: "var(--info)"). 기본 info 토큰. */
  color?: string;
  label?: string;
  className?: string;
}

/**
 * 외부 차트 라이브러리 없이 자체 제작한 인라인 SVG 추세 차트.
 * CSP(strict, no external script/style)에서도 동작하도록 인라인 style/색상 변수만 사용한다.
 * 데이터가 2개 미만이면 평탄한 빈 상태 선을 표시한다.
 */
export function TrendChart({
  points,
  width = 200,
  height = 56,
  min,
  max,
  unit = "",
  color = "var(--info)",
  label,
  className,
}: TrendChartProps) {
  const geometry = trendGeometry(points, { width, height, min, max });
  const latest = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)} style={{ width: "100%", maxWidth: width }}>
      {(label || latest !== null) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && <span className="text-caption text-text-muted">{label}</span>}
          <span className="num ml-auto text-body-sm font-semibold text-text">
            {latest !== null ? latest.toFixed(1) : "-"}
            {unit && <span className="ml-0.5 text-caption font-normal text-text-muted">{unit}</span>}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", maxWidth: "100%", height, display: "block" }}
        role="img"
        aria-label={label ? `${label} 추세 차트` : "추세 차트"}
      >
        {geometry ? (
          <>
            <line x1={0} y1={0.5} x2={width} y2={0.5} stroke="var(--border)" strokeWidth={1} opacity={0.6} />
            <line
              x1={0}
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2,3"
              opacity={0.5}
            />
            <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="var(--border)" strokeWidth={1} opacity={0.6} />
            <path d={geometry.areaPath} fill={color} opacity={0.15} stroke="none" />
            <polyline
              points={geometry.linePoints}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : (
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="var(--border)"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
        )}
      </svg>
    </div>
  );
}
