import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface StepOpts {
  min: number;
  max: number;
  step: number;
}

/** 현재값을 delta(±1) 방향으로 step만큼 이동하고 min/max로 클램프 */
export function stepValue(current: number, delta: 1 | -1, { min, max, step }: StepOpts): number {
  const next = current + delta * step;
  return Math.min(max, Math.max(min, next));
}

export interface NumberStepperProps {
  "aria-label": string;
  defaultValue?: number;
  value?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 현장 키오스크용 대형 크기 */
  kiosk?: boolean;
  disabled?: boolean;
}

export const NumberStepper = React.forwardRef<HTMLInputElement, NumberStepperProps>(function NumberStepper(
  {
    "aria-label": ariaLabel,
    defaultValue = 0,
    value,
    onValueChange,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    kiosk = false,
    disabled = false,
  },
  ref,
) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = isControlled ? value : internal;

  // 입력창 표시용 원본 문자열 — 편집 중 빈 문자열을 허용해 0 스냅을 방지
  const [draft, setDraft] = React.useState(String(current));
  React.useEffect(() => {
    setDraft(String(current));
  }, [current]);

  function set(next: number) {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  }

  function bump(delta: 1 | -1) {
    set(stepValue(current, delta, { min, max, step }));
  }

  const btn = cn(
    "flex items-center justify-center rounded-md border border-border bg-elevated text-text transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
    kiosk ? "h-14 w-14" : "h-9 w-9",
  );

  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" aria-label="감소" className={btn} onClick={() => bump(-1)} disabled={disabled || current <= min}>
        <Minus size={kiosk ? 24 : 16} aria-hidden />
      </button>
      <input
        ref={ref}
        type="number"
        aria-label={ariaLabel}
        className={cn(
          "num rounded-md border border-border bg-surface text-center text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
          kiosk ? "h-14 w-24 text-[28px] font-bold" : "h-9 w-20 text-body-sm",
        )}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw === "") return; // 편집 중 빈 값은 허용(스냅 방지)
          const n = Number(raw);
          if (!Number.isNaN(n)) set(Math.min(max, Math.max(min, n)));
        }}
        onBlur={() => setDraft(String(current))} // 편집 종료 시 마지막 유효값으로 복원
      />
      <button type="button" aria-label="증가" className={btn} onClick={() => bump(1)} disabled={disabled || current >= max}>
        <Plus size={kiosk ? 24 : 16} aria-hidden />
      </button>
    </div>
  );
});
NumberStepper.displayName = "NumberStepper";
