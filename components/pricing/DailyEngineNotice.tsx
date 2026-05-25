"use client";

import { DAILY_ENGINE_DEAD_FIELDS, DAILY_ENGINE_SSOT } from "@/components/pricing/pricingAdminColumns";

export function DailyEngineNotice({ variant = "rules" }: { variant?: "rules" | "vehicle" }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-foreground/90 space-y-2">
      {variant === "vehicle" ? (
        <p>
          <span className="font-semibold text-amber-400">Daily SSOT:</span> edit{" "}
          <span className="font-mono">Daily Package Price</span> ({DAILY_ENGINE_SSOT.rateColumn}) on rows with
          booking type <span className="font-mono">daily</span> / <span className="font-mono">fleet_daily</span>.
          Base fare and per-mile/minute fields are hidden — the engine does not use them for daily bookings.
          £ fields show NET with website price incl. VAT below each input.
        </p>
      ) : (
        <p>
          <span className="font-semibold text-amber-400">Daily rules tab:</span>{" "}
          <span className="font-mono">minimum_days</span> / <span className="font-mono">maximum_days</span> and{" "}
          <span className="font-mono">included_hours</span> are used by the quote engine. Package price (£/day) is on{" "}
          <span className="font-semibold">Vehicle Rates</span> (<span className="font-mono">daily_rate_pence</span>).
          Extra hour/mile fields below are stored but not yet billed.
        </p>
      )}
      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
        {DAILY_ENGINE_DEAD_FIELDS.map((f) => (
          <li key={f.field}>
            <span className="text-foreground/80">{f.adminLabel}</span> ({f.field}) — {f.engine}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HourlyRatesNotice() {
  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">Hourly rate (£/hr)</span> is edited under{" "}
      <span className="font-semibold">Vehicle Rates</span> (filter booking type = hourly). This tab only controls
      min/max hours; <span className="font-mono">billing_increment_hours</span> is not used by the pricing engine.
      Hourly <span className="font-semibold">NET</span> rates show VAT preview (NET / VAT / FINAL WEBSITE PRICE incl. VAT).
    </div>
  );
}

export function FleetRatesNotice() {
  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      Fleet discounts below apply as a <span className="font-semibold">%</span> on the transport subtotal. Per-vehicle
      fleet rates are under <span className="font-semibold">Vehicle Rates</span> (booking types{" "}
      <span className="font-mono">fleet</span>, <span className="font-mono">fleet_hourly</span>,{" "}
      <span className="font-mono">fleet_daily</span>) with VAT preview on £ fields.
    </div>
  );
}
