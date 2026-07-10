import * as React from "react";
import { Delete } from "lucide-react";

import { cn } from "@/lib/utils";

/** 키패드 입력 문자열 변환: 숫자 append(선행 0 대체), back=마지막 삭제, clear=초기화 */
export function applyKey(current: string, key: string): string {
  if (key === "clear") return "";
  if (key === "back") return current.slice(0, -1);
  if (/^[0-9]$/.test(key)) return current === "0" ? key : current + key;
  return current;
}

export interface KioskNumpadProps {
  "aria-label": string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

export function KioskNumpad({ "aria-label": ariaLabel, value, onChange, className }: KioskNumpadProps) {
  const text = String(value);
  const press = (k: string) => {
    const next = applyKey(text, k);
    onChange(next === "" ? 0 : Number(next));
  };
  return (
    <div className={cn("inline-flex w-64 flex-col gap-3", className)}>
      <div
        role="status"
        aria-label={ariaLabel}
        className="num flex h-16 items-center justify-end rounded-lg border border-border bg-surface px-4 text-[32px] font-bold text-text"
      >
        {value.toLocaleString()}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => {
          const label = k === "clear" ? "C" : k === "back" ? "지움" : k;
          const aria = k === "clear" ? "전체 지움" : k === "back" ? "한 자리 지움" : k;
          return (
            <button
              key={k}
              type="button"
              aria-label={aria}
              onClick={() => press(k)}
              className={cn(
                "flex h-16 items-center justify-center rounded-lg border border-border text-[22px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                k === "clear" ? "bg-crit-soft text-crit" : k === "back" ? "bg-elevated text-text-muted" : "bg-surface text-text hover:bg-elevated",
              )}
            >
              {k === "back" ? <Delete size={22} aria-hidden /> : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
