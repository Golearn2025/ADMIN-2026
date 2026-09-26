"use client";

import { Badge } from "@/components/common/badge";
import { cn } from "@/lib/utils";
import { formatText, formatUkDateTime, getTripStatusBadgeVariant, isBookingUnassigned } from "./bookings.utils";
import type { Booking } from "./types";

interface NextUpStripProps {
  bookings: Booking[];
  onSelect?: (booking: Booking) => void;
}

export function NextUpStrip({ bookings, onSelect }: NextUpStripProps) {
  if (!bookings.length) return null;

  return (
    <section className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-wide text-emerald-300">
          Next up
          <span className="ml-2 font-mono text-xs font-normal text-emerald-300/70">
            {bookings.length} paid · upcoming
          </span>
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Payment succeeded only · sorted by pickup (UK) · assigned + unassigned
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {bookings.map((b) => {
          const unassigned = isBookingUnassigned(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelect?.(b)}
              className={cn(
                "relative min-w-[220px] max-w-[260px] shrink-0 rounded-lg border bg-background/80 p-3 text-left transition",
                "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                unassigned ? "border-emerald-300/90" : "border-emerald-500/50"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-lg",
                  unassigned ? "booking-row-next-up-warn" : "booking-row-next-up-info"
                )}
              />
              <div className="relative mb-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{b.reference}</span>
                <Badge
                  variant={unassigned ? "warning" : getTripStatusBadgeVariant(b.trip_status)}
                  className="text-[10px]"
                >
                  {unassigned ? "Unassigned" : formatText(b.trip_status)}
                </Badge>
              </div>
              <div className="relative text-xs font-semibold text-emerald-400">
                {formatUkDateTime(b.scheduled_at)}
              </div>
              <div className="relative mt-1 truncate text-xs font-medium">
                {b.customer_first_name} {b.customer_last_name}
              </div>
              <div className="relative mt-0.5 truncate text-[11px] text-muted-foreground">
                {b.driver_name?.trim() || "No driver yet"}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
