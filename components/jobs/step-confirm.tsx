"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Link2, Loader2, AlertCircle, ExternalLink, Copy, UserRound } from "lucide-react";
import type {
  CustomerForm,
  TripForm,
  VehicleForm,
  PriceForm,
  DispatchForm,
} from "@/hooks/use-new-job";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface StepConfirmProps {
  customer: CustomerForm;
  trip: TripForm;
  vehicle: VehicleForm;
  price: PriceForm;
  dispatch: DispatchForm;
  onDispatchChange: (next: DispatchForm) => void;
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

type DriverOption = { id: string; name: string; phone: string; status: string };

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
  dispatch,
  onDispatchChange,
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
  const [driverQ, setDriverQ] = useState("");
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const displayPrice = price.priceOverride ?? price.quotedPrice;
  const dispatchLocked = Boolean(createdBooking);

  useEffect(() => {
    if (dispatch.mode !== "direct" || dispatchLocked) return;
    setLoadingDrivers(true);
    fetch(`/api/admin/bookings/assignable-drivers?q=${encodeURIComponent(driverQ)}`)
      .then((r) => r.json())
      .then((d) => setDrivers(d.data || []))
      .catch(() => setDrivers([]))
      .finally(() => setLoadingDrivers(false));
  }, [dispatch.mode, driverQ, dispatchLocked]);

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
          <SummaryRow
            label="Model"
            value={
              vehicle.modelId?.trim()
                ? vehicle.modelId.replace(/-/g, " ")
                : `Any ${vehicle.categoryId} (all drivers in category)`
            }
          />
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
          <hr className="border-border" />
          <SummaryRow
            label="Dispatch"
            value={
              dispatch.mode === "direct"
                ? `Direct · ${dispatch.exclusiveDriverName || "pick driver"}`
                : "Open · all matching drivers"
            }
          />
        </CardContent>
      </Card>

      {/* Dispatch mode — choose before create */}
      {!createdBooking && !actionResult && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserRound className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Who should see this job?</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onDispatchChange({
                    mode: "open",
                    exclusiveDriverId: "",
                    exclusiveDriverName: "",
                  })
                }
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm",
                  dispatch.mode === "open"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <span className="font-medium">Open</span>
                <span className="block text-[11px] text-muted-foreground">
                  All drivers in category/model
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onDispatchChange({
                    ...dispatch,
                    mode: "direct",
                  })
                }
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm",
                  dispatch.mode === "direct"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <span className="font-medium">Direct</span>
                <span className="block text-[11px] text-muted-foreground">
                  Only one driver · can accept
                </span>
              </button>
            </div>

            {dispatch.mode === "direct" && (
              <div className="space-y-1.5">
                <Label>Select driver</Label>
                <Input
                  placeholder="Search name or phone…"
                  value={driverQ}
                  onChange={(e) => setDriverQ(e.target.value)}
                  className="h-10"
                />
                <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 divide-y divide-border/40">
                  {loadingDrivers && (
                    <p className="text-xs text-muted-foreground p-3">Loading…</p>
                  )}
                  {!loadingDrivers && drivers.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3">No drivers found</p>
                  )}
                  {drivers.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() =>
                        onDispatchChange({
                          mode: "direct",
                          exclusiveDriverId: d.id,
                          exclusiveDriverName: d.name,
                        })
                      }
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-sm hover:bg-muted/40",
                        dispatch.exclusiveDriverId === d.id && "bg-primary/10"
                      )}
                    >
                      <span className="font-medium">{d.name}</span>
                      {d.phone && (
                        <span className="block text-xs text-muted-foreground">{d.phone}</span>
                      )}
                    </button>
                  ))}
                </div>
                {dispatch.exclusiveDriverId && (
                  <p className="text-[11px] text-muted-foreground">
                    Locked to <span className="font-medium text-foreground">{dispatch.exclusiveDriverName}</span>.
                    Others will not see the job. From Bookings you can later{" "}
                    <span className="font-medium text-foreground">Release to Premium</span>, then it
                    auto-opens to everyone after the timer in Job Dispatch.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              disabled={
                createLoading ||
                (dispatch.mode === "direct" && !dispatch.exclusiveDriverId)
              }
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
            {dispatch.mode === "direct"
              ? "Mark paid & send to driver"
              : "Mark paid & publish"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center -mt-1">
            {dispatch.mode === "direct"
              ? `Only ${dispatch.exclusiveDriverName || "the selected driver"} sees and can accept this job`
              : "Job appears immediately in the driver app (cash / offline payment)"}
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
