import * as React from "react";
import { cn } from "@/lib/utils";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

const MAP: Record<ConnectionStatus, { dot: string; text: string; bg: string; defaultLabel: string }> = {
  connected: { dot: "bg-ok", text: "text-ok", bg: "bg-ok-soft", defaultLabel: "연결됨" },
  disconnected: { dot: "bg-crit", text: "text-crit", bg: "bg-crit-soft", defaultLabel: "연결 끊김" },
  reconnecting: { dot: "bg-warn", text: "text-warn", bg: "bg-warn-soft", defaultLabel: "재연결 중" },
};

export interface ConnectionBadgeProps {
  status: ConnectionStatus;
  label?: string;
  className?: string;
}

export function ConnectionBadge({ status, label, className }: ConnectionBadgeProps) {
  const s = MAP[status];
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold", s.bg, s.text, className)}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", s.dot, status === "reconnecting" && "animate-pulse")}
        aria-hidden
      />
      {label ?? s.defaultLabel}
    </span>
  );
}
