"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatTimeUntilPickup } from "./bookings.utils";

interface PickupCountdownProps {
  scheduledAt: string;
  className?: string;
  /** Larger text on Next up cards */
  prominent?: boolean;
}

export function PickupCountdown({ scheduledAt, className, prominent }: PickupCountdownProps) {
  const [label, setLabel] = useState(() => formatTimeUntilPickup(scheduledAt));

  useEffect(() => {
    const tick = () => setLabel(formatTimeUntilPickup(scheduledAt));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [scheduledAt]);

  return (
    <span
      className={cn(
        prominent ? "text-sm font-bold tabular-nums tracking-tight text-foreground" : "text-xs font-semibold tabular-nums text-emerald-400",
        className
      )}
    >
      {label}
    </span>
  );
}
