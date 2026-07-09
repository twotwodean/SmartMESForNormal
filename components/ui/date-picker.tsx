"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "날짜 선택", "aria-label": ariaLabel, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "inline-flex h-9 w-[200px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-body-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50",
            value ? "text-text" : "text-text-faint",
          )}
        >
          <CalendarIcon size={16} className="text-text-faint" aria-hidden />
          {value ? format(value, "yyyy-MM-dd", { locale: ko }) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <DayPicker
          mode="single"
          locale={ko}
          selected={value}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
          showOutsideDays
          components={{
            IconLeft: () => <ChevronLeft size={16} />,
            IconRight: () => <ChevronRight size={16} />,
          }}
          classNames={{
            months: "flex",
            month: "space-y-2",
            caption: "flex items-center justify-between px-1 pb-1",
            caption_label: "text-body-sm font-semibold text-text",
            nav: "flex items-center gap-1",
            nav_button: "inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            table: "border-collapse",
            head_row: "flex",
            head_cell: "w-8 text-caption font-medium text-text-faint",
            row: "flex",
            cell: "p-0",
            day: "inline-flex h-8 w-8 items-center justify-center rounded-md text-body-sm text-text hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 aria-selected:bg-primary aria-selected:text-primary-fg aria-selected:hover:bg-primary aria-selected:hover:text-primary-fg",
            day_today: "border border-border",
            day_outside: "text-text-faint",
            day_disabled: "opacity-40",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
