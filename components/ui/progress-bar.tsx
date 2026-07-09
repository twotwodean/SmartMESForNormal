import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

const FILL: Record<Tone, string> = {
  primary: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-neutral",
};

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: Tone;
  className?: string;
  "aria-label"?: string;
}

export function ProgressBar({ value, tone = "primary", className, "aria-label": ariaLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-1.5 w-full overflow-hidden rounded bg-elevated", className)}
    >
      <div className={cn("h-full rounded transition-[width]", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
