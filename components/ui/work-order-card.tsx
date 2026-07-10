import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface WorkOrderCardProps {
  code: string;
  item: string;
  qty: number;
  /** 0–100. 생략 시 진척바 미표시 */
  progress?: number;
  statusLabel: string;
  tone: Tone;
  center?: string;
  onClick?: () => void;
  className?: string;
}

export function WorkOrderCard({
  code, item, qty, progress, statusLabel, tone, center, onClick, className,
}: WorkOrderCardProps) {
  const clickable = Boolean(onClick);
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-3 shadow-card",
        clickable && "cursor-pointer transition hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-caption text-text-muted">{code}</span>
        <StatusPill tone={tone}>{statusLabel}</StatusPill>
      </div>
      <div className="mt-1.5 text-body-sm font-medium text-text">{item}</div>
      <div className="num mt-0.5 text-caption text-text-muted">
        {qty.toLocaleString()} EA{center ? ` · ${center}` : ""}
      </div>
      {progress !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={progress} tone={tone} className="flex-1" aria-label={`진척률 ${Math.round(progress)}%`} />
          <span className="num text-caption text-text-muted">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}
