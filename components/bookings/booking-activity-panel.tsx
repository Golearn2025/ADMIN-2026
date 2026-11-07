"use client";

import { useEffect, useState } from "react";
import {
  actionTypeLabel,
  labelForReason,
  DRIVER_CHANGE_REASONS,
  STATUS_CHANGE_REASONS,
  CANCEL_REASONS,
  TRIP_EDIT_REASONS,
  VEHICLE_EDIT_REASONS,
  PAYMENT_OPS_REASONS,
} from "@/lib/bookings/admin-ops";
import { Loader2, History } from "lucide-react";

type ActivityRow = {
  id: string;
  action_type: string;
  reason_code: string | null;
  reason_text: string | null;
  from_value: Record<string, unknown> | null;
  to_value: Record<string, unknown> | null;
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
};

function formatUk(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function reasonLabel(action: string, code: string | null) {
  if (action.startsWith("driver_")) return labelForReason(DRIVER_CHANGE_REASONS, code);
  if (action === "cancel") return labelForReason(CANCEL_REASONS, code);
  if (action === "trip_edit") return labelForReason(TRIP_EDIT_REASONS, code);
  if (action === "vehicle_edit") return labelForReason(VEHICLE_EDIT_REASONS, code);
  if (
    action === "mark_paid" ||
    action === "payment_link" ||
    action === "extra_charge" ||
    action === "note_added"
  ) {
    return labelForReason(PAYMENT_OPS_REASONS, code);
  }
  return labelForReason(STATUS_CHANGE_REASONS, code);
}

function summary(row: ActivityRow): string {
  const from = row.from_value || {};
  const to = row.to_value || {};
  if (row.action_type.startsWith("driver_")) {
    const fromName = (from.driverName as string) || (from.driverId as string) || "none";
    const toName = (to.driverName as string) || (to.driverId as string) || "none";
    if (row.action_type === "driver_unassign") return `Cleared driver (${fromName})`;
    if (row.action_type === "driver_reassign") return `${fromName} → ${toName}`;
    return `Assigned ${toName}`;
  }
  if (row.action_type === "status_change" || row.action_type === "cancel") {
    return `${String(from.status || "—")} → ${String(to.status || "—")}`;
  }
  if (row.action_type === "trip_edit") {
    const bits: string[] = [];
    if (to.pickupAddress && to.pickupAddress !== from.pickupAddress) bits.push("pickup");
    if (to.dropoffAddress && to.dropoffAddress !== from.dropoffAddress) bits.push("dropoff");
    if (to.scheduledAt && to.scheduledAt !== from.scheduledAt) bits.push("time");
    if (to.flightNumber !== undefined && to.flightNumber !== from.flightNumber) bits.push("flight");
    if (to.hoursRequested !== from.hoursRequested) bits.push("hours");
    return bits.length ? bits.join(", ") : "Trip fields updated";
  }
  if (row.action_type === "vehicle_edit") {
    return `${String(from.vehicleCategoryId || "—")}/${String(from.vehicleModelId || "any")} → ${String(to.vehicleCategoryId || "—")}/${String(to.vehicleModelId || "any")}`;
  }
  if (row.action_type === "note_added") return "Internal note added";
  if (row.action_type === "mark_paid") {
    const pence = Number(to.amountPence);
    return Number.isFinite(pence) ? `£${(pence / 100).toFixed(2)} marked paid` : "Marked paid";
  }
  if (row.action_type === "payment_link") return to.hostedUrl ? "Link generated" : "Payment link";
  if (row.action_type === "extra_charge") {
    const pence = Number(to.amountPence);
    const hrs = to.hoursExtra != null ? ` · +${to.hoursExtra}h` : "";
    return Number.isFinite(pence)
      ? `£${(pence / 100).toFixed(2)}${hrs}`
      : "Extra charge";
  }
  return "—";
}

export function BookingActivityPanel({
  bookingId,
  refreshKey = 0,
}: {
  bookingId: string;
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/admin/bookings/${bookingId}/activity`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setRows(data.data || []);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load activity");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [bookingId, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive py-4 text-center">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-6 text-center">
        No admin activity yet for this booking.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        <span>Ops timeline (SSOT)</span>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-xs space-y-1"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">
                {actionTypeLabel(row.action_type)}
              </span>
              <span className="text-muted-foreground">{formatUk(row.created_at)} UK</span>
            </div>
            <p className="text-foreground/90">{summary(row)}</p>
            <p className="text-muted-foreground">
              Reason: {reasonLabel(row.action_type, row.reason_code)}
              {row.reason_text ? ` — ${row.reason_text}` : ""}
            </p>
            <p className="text-muted-foreground/80">
              By {row.actor_name || row.actor_email || "admin"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
