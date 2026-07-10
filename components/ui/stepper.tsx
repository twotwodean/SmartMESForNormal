import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "upcoming";

export function stepStatus(index: number, current: number): StepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "upcoming";
}

export interface StepperProps {
  steps: string[];
  /** 현재 단계 인덱스(0-base) */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((label, i) => {
        const state = stepStatus(i, current);
        const last = i === steps.length - 1;
        return (
          <li key={label} className="flex items-center" aria-current={state === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-caption font-semibold num",
                  state === "done" && "border-ok bg-ok text-white",
                  state === "current" && "border-primary bg-primary text-primary-fg",
                  state === "upcoming" && "border-border bg-surface text-text-faint",
                )}
              >
                {state === "done" ? <Check size={14} aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-caption", state === "upcoming" ? "text-text-faint" : "text-text")}>{label}</span>
            </div>
            {!last && (
              <span className={cn("mx-2 h-px w-10 flex-none", i < current ? "bg-ok" : "bg-border")} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
