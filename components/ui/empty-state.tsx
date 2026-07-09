import * as React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center", className)}>
      <Icon size={32} className="text-text-faint" aria-hidden />
      <div className="text-body font-semibold text-text">{title}</div>
      {description && <div className="max-w-sm text-body-sm text-text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
