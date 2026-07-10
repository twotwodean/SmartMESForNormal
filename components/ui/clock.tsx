"use client";

import * as React from "react";
import { Clock as ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Date → "HH:MM:SS"(24시간, 0 패딩) */
export function formatClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function Clock({ className }: { className?: string }) {
  const [time, setTime] = React.useState<string>("");
  React.useEffect(() => {
    const tick = () => setTime(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={cn("num inline-flex items-center gap-1.5 text-body-sm text-text-muted", className)} suppressHydrationWarning>
      <ClockIcon size={14} aria-hidden />
      {time}
    </span>
  );
}
