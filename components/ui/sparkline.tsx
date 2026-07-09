import * as React from "react";

interface SparkOpts {
  width: number;
  height: number;
}

/** 값 배열을 SVG polyline points 문자열로 변환(y축 반전). 값이 2개 미만이면 빈 문자열. */
export function sparklinePoints(values: number[], { width, height }: SparkOpts): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = span === 0 ? height / 2 : Math.round(height - ((v - min) / span) * height);
      return `${x},${y}`;
    })
    .join(" ");
}

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** stroke 색 (CSS 색/변수). 기본 currentColor */
  stroke?: string;
}

export function Sparkline({ values, width = 52, height = 20, className, stroke = "currentColor" }: SparklineProps) {
  const points = sparklinePoints(values, { width, height });
  if (!points) return null;
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}
