import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

/** 채워진 비율에 해당하는 stroke-dashoffset (value 0–100, 벗어나면 클램프) */
export function gaugeOffset(value: number, circumference: number): number {
  const pct = Math.min(100, Math.max(0, value));
  return circumference * (1 - pct / 100);
}

const STROKE: Record<Tone, string> = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  info: "var(--info)",
  neutral: "var(--neutral)",
};

export interface GaugeTileProps {
  label: string;
  value: number; // 0–100
  unit?: string;
  tone?: Tone;
  size?: number;
  className?: string;
}

export function GaugeTile({ label, value, unit = "%", tone = "primary", size = 120, className }: GaugeTileProps) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = gaugeOffset(value, c);
  const shown = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--elevated)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={STROKE[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500 motion-safe:ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="num text-h3 font-bold text-text">
            {shown}
            <span className="text-body font-semibold text-text-muted">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-caption text-text-muted">{label}</span>
    </div>
  );
}
