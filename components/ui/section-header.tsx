import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** 우측 액션 슬롯(버튼 등) */
  actions?: React.ReactNode;
}

export function SectionHeader({ title, description, actions, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)} {...props}>
      <div>
        <h1 className="text-h1 font-bold text-text">{title}</h1>
        {description && <p className="mt-0.5 text-body-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
