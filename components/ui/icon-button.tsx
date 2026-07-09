import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";

export interface IconButtonProps extends ButtonProps {
  "aria-label": string; // 아이콘 전용이므로 라벨 필수
}

const sizeSquare = { sm: "h-8 w-8 px-0", md: "h-9 w-9 px-0", lg: "h-11 w-11 px-0" } as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), sizeSquare[size ?? "md"], className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
