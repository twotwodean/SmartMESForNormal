import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-elevated px-2 py-0.5 text-caption font-medium text-text-muted",
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
