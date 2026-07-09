import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export type Tone = "primary" | "ok" | "warn" | "crit" | "info" | "neutral";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold leading-relaxed",
  {
    variants: {
      tone: {
        primary: "bg-primary-soft text-primary",
        ok: "bg-ok-soft text-ok",
        warn: "bg-warn-soft text-warn",
        crit: "bg-crit-soft text-crit",
        info: "bg-info-soft text-info",
        neutral: "bg-neutral-soft text-neutral",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  /** 색상 점 표시 여부 (기본 true) */
  dot?: boolean;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ tone, dot = true, className, children, ...props }, ref) => (
    <span ref={ref} className={cn(pillVariants({ tone }), className)} {...props}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  ),
);
StatusPill.displayName = "StatusPill";

// 상태 → tone 매핑 (design-tokens STATUS_COLOR와 일치)
export function workOrderTone(status: "WAITING" | "RUNNING" | "DONE" | "CANCELLED"): Tone {
  const map: Record<typeof status, Tone> = { WAITING: "warn", RUNNING: "primary", DONE: "ok", CANCELLED: "neutral" };
  return map[status];
}
export function equipmentTone(status: "RUN" | "STOP" | "REPAIR"): Tone {
  const map: Record<typeof status, Tone> = { RUN: "ok", STOP: "neutral", REPAIR: "crit" };
  return map[status];
}
export function inspectionTone(status: "PASS" | "FAIL" | "SPECIAL"): Tone {
  const map: Record<typeof status, Tone> = { PASS: "ok", FAIL: "crit", SPECIAL: "warn" };
  return map[status];
}
export function stockTone(status: "NORMAL" | "BELOW" | "NEGATIVE"): Tone {
  const map: Record<typeof status, Tone> = { NORMAL: "neutral", BELOW: "warn", NEGATIVE: "crit" };
  return map[status];
}
