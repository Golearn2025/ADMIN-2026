"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
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
 * DateTime field for dark admin UI.
 * Hides the native black calendar glyph; uses a gold Calendar affordance.
 * Whole control is a large tap target on mobile (native picker still opens).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  required,
  className,
  min,
}: DateTimeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
      el.click();
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="datetime-local"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            // Touch-friendly height (mobile + desktop)
            "h-12 min-h-[48px] sm:h-11 sm:min-h-0",
            "pl-3 pr-12 text-base sm:text-sm font-medium tracking-wide",
            "bg-secondary/60 border-border/80 text-foreground",
            "hover:border-primary/40 hover:bg-secondary/80",
            "focus-visible:ring-primary/40 focus-visible:border-primary",
            // Keep scheme dark so native picker chrome matches admin
            "[color-scheme:dark]",
            // Hide native black calendar icon; keep hit-area via our button
            "[&::-webkit-calendar-picker-indicator]:opacity-0",
            "[&::-webkit-calendar-picker-indicator]:absolute",
            "[&::-webkit-calendar-picker-indicator]:inset-0",
            "[&::-webkit-calendar-picker-indicator]:h-full",
            "[&::-webkit-calendar-picker-indicator]:w-full",
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
            "[&::-webkit-datetime-edit]:text-foreground",
            "[&::-webkit-datetime-edit-fields-wrapper]:p-0",
            "[&::-webkit-datetime-edit-text]:text-muted-foreground/80",
            "[&::-webkit-datetime-edit-month-field]:text-foreground",
            "[&::-webkit-datetime-edit-day-field]:text-foreground",
            "[&::-webkit-datetime-edit-year-field]:text-foreground",
            "[&::-webkit-datetime-edit-hour-field]:text-foreground",
            "[&::-webkit-datetime-edit-minute-field]:text-foreground",
            "[&::-webkit-datetime-edit-ampm-field]:text-foreground"
          )}
        />

        {/* Visible gold calendar — taps open the native picker */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Open calendar"
          onClick={openPicker}
          className={cn(
            "absolute right-1.5 top-1/2 z-10 -translate-y-1/2",
            "flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md",
            "bg-primary/15 text-primary",
            "hover:bg-primary/25 active:bg-primary/30",
            "transition-colors touch-manipulation"
          )}
        >
          <Calendar className="h-4 w-4 sm:h-[15px] sm:w-[15px]" strokeWidth={2} />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">UK time (Europe/London)</p>
    </div>
  );
}
