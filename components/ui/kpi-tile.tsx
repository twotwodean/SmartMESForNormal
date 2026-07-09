import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";
import type { Tone } from "@/components/ui/status-pill";

const STRIPE: Record<Tone, string> = {
  primary: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-neutral",
};

const SPARK: Record<Tone, string> = {
  primary: "var(--primary)",
  ok: "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  info: "var(--info)",
  neutral: "var(--neutral)",
};

export interface KPITileProps {
  label: string;
  value: string;
  unit?: string;
  /** 델타 텍스트(예: "3.1%p"). 부호는 direction으로 표현 */
  delta?: string;
  direction?: "up" | "down";
  /** 상승이 좋은 지표인가(색 결정). 기본 true */
  upIsGood?: boolean;
  tone?: Tone;
  spark?: number[];
  note?: string;
}

export function KPITile({
  label,
  value,
  unit,
  delta,
  direction,
  upIsGood = true,
  tone = "primary",
  spark,
  note,
}: KPITileProps) {
  const positive = direction === "up" ? upIsGood : direction === "down" ? !upIsGood : true;
  const deltaColor = delta && direction ? (positive ? "text-ok" : "text-crit") : "text-text-muted";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-card">
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", STRIPE[tone])} aria-hidden />
      <div className="text-caption text-text-muted">{label}</div>
      <div className="mt-1.5 text-[27px] font-bold leading-none num">
        {value}
        {unit && <span className="ml-0.5 text-body font-semibold text-text-muted">{unit}</span>}
      </div>
      {delta && (
        <div className={cn("mt-1 inline-flex items-center gap-0.5 text-caption font-semibold", deltaColor)}>
          {direction === "up" && <ArrowUp size={12} aria-hidden />}
          {direction === "down" && <ArrowDown size={12} aria-hidden />}
          <span className="num">{delta}</span>
        </div>
      )}
      {note && <div className="mt-1 text-caption text-text-muted">{note}</div>}
      {spark && spark.length > 1 && (
        <div className="absolute bottom-2.5 right-3">
          <Sparkline values={spark} stroke={SPARK[tone]} />
        </div>
      )}
    </div>
  );
}
