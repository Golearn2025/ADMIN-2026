"use client";

import { Badge } from "@/components/common/badge";
import { cn } from "@/lib/utils";
import {
  formatText,
  formatUkDateTime,
  getBookingOpsTier,
  getBookingOpsTierMeta,
  getTripStatusBadgeVariant,
  isBookingUnassigned,
} from "./bookings.utils";
import { PickupCountdown } from "./pickup-countdown";
import type { Booking } from "./types";

interface NextUpStripProps {
  bookings: Booking[];
  soonestUpcomingId: string | null;
  onSelect?: (booking: Booking) => void;
}

const LEGEND = [
  { color: "bg-red-500", label: "≤3h · unassigned" },
  { color: "bg-amber-500", label: "≤24h unassigned / ≤3h assigned" },
  { color: "bg-amber-500/50", label: ">24h · needs driver" },
  { color: "bg-emerald-400", label: "Next job · running light on bar" },
  { color: "bg-emerald-500/30", label: "Alte joburi · bară palidă" },
] as const;

export function NextUpStrip({ bookings, soonestUpcomingId, onSelect }: NextUpStripProps) {
  if (!bookings.length) return null;

  return (
    <section className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-foreground">
            Next up
            <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
              {bookings.length} paid · upcoming
            </span>
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Fixed left bar · Audi-style running light when urgent · payment succeeded
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-1 rounded-full", item.color)} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {bookings.map((b) => {
          const tier = getBookingOpsTier(b) ?? "ok";
          const isSoonest = !!soonestUpcomingId && b.id === soonestUpcomingId;
          const meta = getBookingOpsTierMeta(tier, { isSoonest });
          const unassigned = isBookingUnassigned(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelect?.(b)}
              className={cn(
                "relative min-w-[220px] max-w-[260px] shrink-0 rounded-lg border border-border p-3 text-left transition",
                "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                meta.cardClass
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{b.reference}</span>
                <Badge variant={meta.badgeVariant} className="text-[10px]">
                  {meta.label}
                </Badge>
              </div>
              <PickupCountdown scheduledAt={b.scheduled_at} prominent />
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Pickup {formatUkDateTime(b.scheduled_at)}
              </div>
              <div className="mt-1 truncate text-xs font-medium">
                {b.customer_first_name} {b.customer_last_name}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 truncate text-[11px] text-muted-foreground">
                <span>{b.driver_name?.trim() || "No driver yet"}</span>
                {!unassigned && (
                  <Badge variant={getTripStatusBadgeVariant(b.trip_status)} className="text-[9px] shrink-0">
                    {formatText(b.trip_status)}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
