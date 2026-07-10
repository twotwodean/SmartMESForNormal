import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: Crumb[];
}

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className={cn("flex items-center gap-1 text-body-sm", className)} {...props}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            {c.href && !last ? (
              <a href={c.href} className="text-text-muted hover:text-text">{c.label}</a>
            ) : (
              <span className={last ? "font-semibold text-text" : "text-text-muted"} aria-current={last ? "page" : undefined}>
                {c.label}
              </span>
            )}
            {!last && <ChevronRight size={14} className="text-text-faint" aria-hidden />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
