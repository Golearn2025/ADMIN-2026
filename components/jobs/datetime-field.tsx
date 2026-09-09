"use client";

import { CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateTimeFieldProps {
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
}

/**
 * Dark-theme friendly datetime-local field.
 * Native calendar icon is restyled; lucide icon gives a clear affordance.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  required,
  className,
  min,
}: DateTimeFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative group">
        <CalendarClock
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary/80"
          aria-hidden
        />
        <Input
          type="datetime-local"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            "h-11 pl-10 pr-3 font-medium tracking-wide",
            "bg-secondary/60 border-border/80 text-foreground",
            "hover:border-primary/40 hover:bg-secondary/80",
            "focus-visible:ring-primary/40 focus-visible:border-primary",
            "[color-scheme:dark]",
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
            "[&::-webkit-calendar-picker-indicator]:opacity-70",
            "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
            "[&::-webkit-calendar-picker-indicator]:invert",
            "[&::-webkit-calendar-picker-indicator]:brightness-150",
            "[&::-webkit-calendar-picker-indicator]:ml-auto",
            "[&::-webkit-datetime-edit]:text-foreground",
            "[&::-webkit-datetime-edit-fields-wrapper]:p-0",
            "[&::-webkit-datetime-edit-text]:text-muted-foreground",
            "[&::-webkit-datetime-edit-month-field]:text-foreground",
            "[&::-webkit-datetime-edit-day-field]:text-foreground",
            "[&::-webkit-datetime-edit-year-field]:text-foreground",
            "[&::-webkit-datetime-edit-hour-field]:text-foreground",
            "[&::-webkit-datetime-edit-minute-field]:text-foreground",
            "[&::-webkit-datetime-edit-ampm-field]:text-foreground"
          )}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">UK time (Europe/London)</p>
    </div>
  );
}
