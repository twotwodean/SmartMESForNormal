import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-elevated px-2 py-0.5 text-caption font-medium text-text-muted",
        className,
      )}
      {...props}
    />
  );
}
