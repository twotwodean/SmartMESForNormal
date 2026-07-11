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

/** 상태 애니메이션: "pulse"는 점(dot)만 은은하게 맥동(가동 중), "blink"는 배지 전체를 점멸(알람 등 이상 상태 전용).
 * 기본값 "none" — 기존 사용처의 시각은 변하지 않는다. */
export type StatusPillAnimation = "pulse" | "blink" | "none";

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  /** 색상 점 표시 여부 (기본 true) */
  dot?: boolean;
  /** 상태 애니메이션 (기본 "none" = 애니메이션 없음, 기존 동작 유지) */
  animate?: StatusPillAnimation;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ tone, dot = true, animate = "none", className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(pillVariants({ tone }), animate === "blink" && "animate-blink", className)}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full bg-current", animate === "pulse" && "animate-pulse-dot")}
        />
      )}
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
