"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Link2, Loader2, AlertCircle, ExternalLink, Copy } from "lucide-react";
import type { CustomerForm, TripForm, VehicleForm, PriceForm } from "@/hooks/use-new-job";
import { useState } from "react";

interface StepConfirmProps {
  customer: CustomerForm;
  trip: TripForm;
  vehicle: VehicleForm;
  price: PriceForm;
  createLoading: boolean;
  createError: string | null;
  createdBooking: { bookingId: string; reference: string } | null;
  actionLoading: boolean;
  actionResult: { type: "paid" | "link"; message: string; url?: string } | null;
  onCreateJob: () => void;
  onMarkPaid: () => void;
  onSendPaymentLink: () => void;
  onPrev: () => void;
}

const BOOKING_TYPE_LABELS: Record<string, string> = {
  oneway: "One-way",
  return: "Return",
  hourly: "Hourly",
  daily: "Daily",
  fleet: "Fleet",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `£${n.toFixed(2)}`;
}

export function StepConfirm({
  customer,
  trip,
  vehicle,
  price,
  createLoading,
  createError,
  createdBooking,
  actionLoading,
  actionResult,
  onCreateJob,
  onMarkPaid,
  onSendPaymentLink,
  onPrev,
}: StepConfirmProps) {
  const [copied, setCopied] = useState(false);
  const displayPrice = price.priceOverride ?? price.quotedPrice;

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const scheduledFormatted = trip.scheduledAt
    ? new Date(trip.scheduledAt).toLocaleString("en-GB", {
        timeZone: "Europe/London",
        dateStyle: "medium",
        timeStyle: "short",
        hour12: false,
      })
    : "—";

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <Card>
        <CardContent className="p-4 space-y-4 text-sm">
          <SummaryRow label="Customer" value={`${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email} />
          <SummaryRow label="Email" value={customer.email} />
          <SummaryRow label="Phone" value={customer.phone || "—"} />
          <hr className="border-border" />
          <SummaryRow label="Trip type" value={BOOKING_TYPE_LABELS[trip.bookingType] || trip.bookingType} />
          <SummaryRow label="Pickup" value={trip.pickup?.address || "—"} />
          {trip.dropoff?.address && <SummaryRow label="Dropoff" value={trip.dropoff.address} />}
          {trip.stops.length > 0 && (
            <SummaryRow label="Stops" value={trip.stops.map(s => s.address).join(" → ")} />
          )}
          <SummaryRow label="Pickup time (UK)" value={scheduledFormatted} />
          {trip.returnAt && (
            <SummaryRow
              label="Return pickup (UK)"
              value={new Date(trip.returnAt).toLocaleString("en-GB", {
                timeZone: "Europe/London",
                dateStyle: "medium",
                timeStyle: "short",
                hour12: false,
              })}
            />
          )}
          {trip.bookingType === "hourly" && <SummaryRow label="Hours" value={`${trip.hours}h`} />}
          {trip.bookingType === "daily" && <SummaryRow label="Days" value={`${trip.days} days`} />}
          <SummaryRow label="Passengers" value={`${trip.passengers} · ${trip.bags} bags`} />
          {trip.flightNumber && <SummaryRow label="Flight no." value={trip.flightNumber} />}
          <hr className="border-border" />
          <SummaryRow label="Category" value={vehicle.categoryId} />
          <SummaryRow label="Model" value={vehicle.modelId.replace(/-/g, " ")} />
          <hr className="border-border" />
          <SummaryRow
            label="Total"
            value={fmt(displayPrice)}
            highlight
          />
          {price.priceOverride != null && (
            <SummaryRow label="Manual override" value="Yes" />
          )}
          {price.driverPayout != null && (
            <SummaryRow label="Driver payout" value={fmt(price.driverPayout)} />
          )}
        </CardContent>
      </Card>

      {createError && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {createError}
        </div>
      )}

      {/* Action result */}
      {actionResult && (
        <Card className={actionResult.type === "paid" ? "border-green-500/30 bg-green-500/5" : "border-blue-500/30 bg-blue-500/5"}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 ${actionResult.type === "paid" ? "text-green-600" : "text-blue-600"}`} />
              <p className="text-sm font-medium">{actionResult.message}</p>
            </div>
            {actionResult.url && (
              <div className="flex items-center gap-2">
                <a
                  href={actionResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline truncate flex-1"
                >
                  {actionResult.url}
                </a>
                <button
                  type="button"
                  onClick={() => copyLink(actionResult.url!)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <a href={actionResult.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            )}
            {createdBooking && (
              <p className="text-xs text-muted-foreground">Ref: {createdBooking.reference}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Create booking */}
      {!createdBooking && !actionResult && (
        <>
          <p className="text-xs text-muted-foreground text-center">
            Review all details and create the job.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onPrev} disabled={createLoading}>
              ← Back
            </Button>
            <Button
              className="flex-1"
              onClick={onCreateJob}
              disabled={createLoading}
            >
              {createLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
              ) : (
                "Create Job"
              )}
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Choose action after booking created */}
      {createdBooking && !actionResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm font-medium">
              Job created: <span className="text-primary font-mono">{createdBooking.reference}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center">What next?</p>

          {/* Mark paid */}
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            onClick={onMarkPaid}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Mark paid & publish
          </Button>
          <p className="text-[10px] text-muted-foreground text-center -mt-1">
            Job appears immediately in the driver app (cash / offline payment)
          </p>

          {/* Send payment link */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onSendPaymentLink}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Generate payment link
          </Button>
          <p className="text-[10px] text-muted-foreground text-center -mt-1">
            Job appears in the driver app only after the customer pays
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0 min-w-[90px]">{label}</span>
      <span className={`text-right text-sm ${highlight ? "font-bold text-primary text-base" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
