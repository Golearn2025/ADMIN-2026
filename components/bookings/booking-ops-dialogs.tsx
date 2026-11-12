"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ADMIN_STATUS_OPTIONS,
  CANCEL_REASONS,
  DRIVER_CHANGE_REASONS,
  PAYMENT_OPS_REASONS,
  STATUS_CHANGE_REASONS,
  TRIP_EDIT_REASONS,
  VEHICLE_CATEGORIES,
  VEHICLE_EDIT_REASONS,
  VEHICLE_MODELS,
} from "@/lib/bookings/admin-ops";
import { DateTimeField } from "@/components/jobs/datetime-field";
import { PlacesAutocomplete } from "@/components/jobs/places-autocomplete";
import type { LocationPoint } from "@/hooks/use-new-job";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2 } from "lucide-react";

function toLocationPoint(args: {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
}): LocationPoint | null {
  const address = args.address?.trim() || "";
  if (!address) return null;
  const lat = args.lat != null ? Number(args.lat) : 0;
  const lng = args.lng != null ? Number(args.lng) : 0;
  return {
    address,
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    placeId: args.placeId || undefined,
  };
}

function hasResolvedPlace(point: LocationPoint | null): boolean {
  return Boolean(
    point?.address &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat !== 0
  );
}

type DriverOption = { id: string; name: string; phone: string };

/** Mobile = bottom sheet; desktop = centered modal (overrides default Dialog center). */
const sheetClass =
  "w-[calc(100%-1.5rem)] max-w-md sm:max-w-lg gap-3 p-4 sm:p-6 " +
  "bottom-3 top-auto translate-y-0 rounded-2xl " +
  "sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg " +
  "max-h-[85dvh] overflow-y-auto data-[state=open]:slide-in-from-bottom-4 " +
  "sm:data-[state=open]:slide-in-from-top-[48%]";

async function postOps(
  bookingId: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
  const res = await fetch(`/api/admin/bookings/${bookingId}/ops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { success: false, error: data.error || "Request failed" };
  }
  return { success: true, data };
}

type OpsContext = {
  booking: {
    id: string;
    reference: string;
    status: string;
    bookingType: string | null;
    hoursRequested: number | null;
    daysRequested: number | null;
    notesInternal: string | null;
  };
  mainLeg: {
    id: string;
    scheduledAtLocal: string;
    pickupAddress: string | null;
    pickupLat?: number | null;
    pickupLng?: number | null;
    pickupPlaceId?: string | null;
    dropoffAddress: string | null;
    dropoffLat?: number | null;
    dropoffLng?: number | null;
    dropoffPlaceId?: string | null;
    flightNumber: string | null;
    vehicleCategoryId: string | null;
    vehicleModelId: string | null;
  } | null;
  returnLeg: { id: string; scheduledAtLocal: string } | null;
  latestPayment: { amount_pence: number; currency: string; status: string } | null;
};

async function fetchOpsContext(bookingId: string): Promise<OpsContext | null> {
  try {
    const res = await fetch(`/api/admin/bookings/${bookingId}/ops-context`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function ReasonSelect({
  reasons,
  value,
  onChange,
}: {
  reasons: readonly { code: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
    >
      <option value="">Select reason…</option>
      {reasons.map((r) => (
        <option key={r.code} value={r.code}>
          {r.label}
        </option>
      ))}
    </select>
  );
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  bookingId,
  currentDriverName,
  mode,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  currentDriverName?: string | null;
  mode: "assign" | "unassign";
  onDone: () => void;
}) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [driverId, setDriverId] = useState("");
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || mode !== "assign") return;
    setLoadingDrivers(true);
    fetch(`/api/admin/bookings/assignable-drivers?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setDrivers(d.data || []))
      .catch(() => setDrivers([]))
      .finally(() => setLoadingDrivers(false));
  }, [open, mode, q]);

  useEffect(() => {
    if (!open) {
      setReasonCode("");
      setReasonText("");
      setDriverId("");
      setQ("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: mode,
      driverId: mode === "assign" ? driverId : undefined,
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>
            {mode === "unassign"
              ? "Unassign driver"
              : currentDriverName
                ? "Reassign driver"
                : "Assign driver"}
          </DialogTitle>
          <DialogDescription>
            {mode === "unassign"
              ? `Remove ${currentDriverName || "current driver"} from this job. Reason is required.`
              : "Pick an approved driver. A reason is required for the activity log."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {mode === "assign" && (
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <Input
                placeholder="Search name or phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11"
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
                    onClick={() => setDriverId(d.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm hover:bg-muted/40",
                      driverId === d.id && "bg-primary/10"
                    )}
                  >
                    <span className="font-medium">{d.name}</span>
                    {d.phone && (
                      <span className="block text-xs text-muted-foreground">{d.phone}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <ReasonSelect
              reasons={DRIVER_CHANGE_REASONS}
              value={reasonCode}
              onChange={setReasonCode}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={2}
              placeholder="Extra context for the log…"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || !reasonCode || (mode === "assign" && !driverId)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  bookingId,
  currentStatus,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  currentStatus: string;
  onDone: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(currentStatus);
      setReasonCode("");
      setReasonText("");
      setError(null);
    }
  }, [open, currentStatus]);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "status",
      status,
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Change status</DialogTitle>
          <DialogDescription>
            Current: <span className="font-medium text-foreground">{currentStatus}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>New status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm"
            >
              {ADMIN_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <ReasonSelect
              reasons={STATUS_CHANGE_REASONS}
              value={reasonCode}
              onChange={setReasonCode}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || !reasonCode || status === currentStatus}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  reference,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  reference: string;
  onDone: () => void;
}) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReasonCode("");
      setReasonText("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "cancel",
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Cancel booking</DialogTitle>
          <DialogDescription>
            Cancel <span className="font-mono font-medium text-foreground">{reference}</span>. This
            updates booking + legs and writes to the activity log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <ReasonSelect reasons={CANCEL_REASONS} value={reasonCode} onChange={setReasonCode} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={() => void submit()}
            disabled={loading || !reasonCode}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditTripDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [ctxLoading, setCtxLoading] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [returnAtLocal, setReturnAtLocal] = useState("");
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [dropoff, setDropoff] = useState<LocationPoint | null>(null);
  const [hadDropoff, setHadDropoff] = useState(false);
  const [flightNumber, setFlightNumber] = useState("");
  const [hoursRequested, setHoursRequested] = useState("");
  const [daysRequested, setDaysRequested] = useState("");
  const [hasReturn, setHasReturn] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCtxLoading(true);
    setError(null);
    setReasonCode("");
    setReasonText("");
    void fetchOpsContext(bookingId).then((ctx) => {
      if (ctx?.mainLeg) {
        setScheduledAtLocal(ctx.mainLeg.scheduledAtLocal || "");
        setPickup(
          toLocationPoint({
            address: ctx.mainLeg.pickupAddress,
            lat: ctx.mainLeg.pickupLat,
            lng: ctx.mainLeg.pickupLng,
            placeId: ctx.mainLeg.pickupPlaceId,
          })
        );
        const nextDropoff = toLocationPoint({
          address: ctx.mainLeg.dropoffAddress,
          lat: ctx.mainLeg.dropoffLat,
          lng: ctx.mainLeg.dropoffLng,
          placeId: ctx.mainLeg.dropoffPlaceId,
        });
        setDropoff(nextDropoff);
        setHadDropoff(Boolean(ctx.mainLeg.dropoffAddress));
        setFlightNumber(ctx.mainLeg.flightNumber || "");
      }
      setHasReturn(Boolean(ctx?.returnLeg));
      setReturnAtLocal(ctx?.returnLeg?.scheduledAtLocal || "");
      setHoursRequested(
        ctx?.booking.hoursRequested != null ? String(ctx.booking.hoursRequested) : ""
      );
      setDaysRequested(
        ctx?.booking.daysRequested != null ? String(ctx.booking.daysRequested) : ""
      );
      setCtxLoading(false);
    });
  }, [open, bookingId]);

  async function submit() {
    setError(null);
    if (!hasResolvedPlace(pickup)) {
      setError("Select pickup from Google suggestions (so the pin updates).");
      return;
    }
    if ((hadDropoff || dropoff?.address) && !hasResolvedPlace(dropoff)) {
      setError("Select dropoff from Google suggestions (so the pin updates).");
      return;
    }

    setLoading(true);
    const result = await postOps(bookingId, {
      action: "edit_trip",
      scheduledAtLocal,
      returnAtLocal: hasReturn ? returnAtLocal : undefined,
      pickupAddress: pickup?.address || "",
      pickupLat: pickup?.lat,
      pickupLng: pickup?.lng,
      pickupPlaceId: pickup?.placeId || "",
      dropoffAddress: dropoff?.address || "",
      dropoffLat: dropoff?.lat,
      dropoffLng: dropoff?.lng,
      dropoffPlaceId: dropoff?.placeId || "",
      flightNumber,
      hoursRequested: hoursRequested || undefined,
      daysRequested: daysRequested || undefined,
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Edit trip</DialogTitle>
          <DialogDescription>
            Pick addresses from Google so the driver pin updates. Price stays unchanged.
          </DialogDescription>
        </DialogHeader>
        {ctxLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <DateTimeField
              label="Pickup (London)"
              value={scheduledAtLocal}
              onChange={setScheduledAtLocal}
            />
            {hasReturn && (
              <DateTimeField
                label="Return (London)"
                value={returnAtLocal}
                onChange={setReturnAtLocal}
              />
            )}
            <PlacesAutocomplete
              label="Pickup address"
              value={pickup}
              onChange={setPickup}
              placeholder="Search hotel / address in Google..."
              required
            />
            {(hadDropoff || dropoff) && (
              <PlacesAutocomplete
                label="Dropoff address"
                value={dropoff}
                onChange={setDropoff}
                placeholder="Search hotel / address in Google..."
              />
            )}
            <div className="space-y-1.5">
              <Label>Flight number</Label>
              <Input
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                className="h-11"
                placeholder="e.g. BA123"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Hours</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hoursRequested}
                  onChange={(e) => setHoursRequested(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Days</Label>
                <Input
                  type="number"
                  min={0}
                  value={daysRequested}
                  onChange={(e) => setDaysRequested(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <ReasonSelect
                reasons={TRIP_EDIT_REASONS}
                value={reasonCode}
                onChange={setReasonCode}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={2}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || ctxLoading || !reasonCode}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditVehicleDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState("executive");
  const [modelId, setModelId] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCtxLoading(true);
    setReasonCode("");
    setReasonText("");
    setError(null);
    void fetchOpsContext(bookingId).then((ctx) => {
      const cat = ctx?.mainLeg?.vehicleCategoryId || "executive";
      const known = VEHICLE_CATEGORIES.some((c) => c.id === cat) ? cat : "executive";
      setCategoryId(known);
      setModelId(ctx?.mainLeg?.vehicleModelId || "");
      setCtxLoading(false);
    });
  }, [open, bookingId]);

  const models = VEHICLE_MODELS[categoryId] || [];

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "edit_vehicle",
      vehicleCategoryId: categoryId,
      vehicleModelId: modelId,
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Edit vehicle</DialogTitle>
          <DialogDescription>
            Change category or model. Empty model = any in category.
          </DialogDescription>
        </DialogHeader>
        {ctxLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(c.id);
                      setModelId("");
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left text-sm font-medium",
                      categoryId === c.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModelId("")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    modelId === ""
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Any model
                </button>
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelId(m.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      modelId === m.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <ReasonSelect
                reasons={VEHICLE_EDIT_REASONS}
                value={reasonCode}
                onChange={setReasonCode}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={2}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || ctxLoading || !reasonCode}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddNoteDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState("ops_decision");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNote("");
      setReasonCode("ops_decision");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "add_note",
      note,
      reasonCode,
      reasonText: note,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Internal note</DialogTitle>
          <DialogDescription>
            Appended to notes_internal and written to the activity log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Ops note visible only in admin…"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={loading || !note.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [amountPounds, setAmountPounds] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReasonCode("");
    setReasonText("");
    setError(null);
    void fetchOpsContext(bookingId).then((ctx) => {
      const pence = ctx?.latestPayment?.amount_pence;
      setAmountPounds(pence != null ? (pence / 100).toFixed(2) : "");
    });
  }, [open, bookingId]);

  async function submit() {
    const pounds = Number(amountPounds);
    if (!Number.isFinite(pounds) || pounds <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "mark_paid",
      amountPence: Math.round(pounds * 100),
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>
            Cash / POS / bank transfer bypass. Confirms booking and publishes to drivers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Amount (£)</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={amountPounds}
              onChange={(e) => setAmountPounds(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <ReasonSelect
              reasons={PAYMENT_OPS_REASONS}
              value={reasonCode}
              onChange={setReasonCode}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={loading || !reasonCode || !amountPounds}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentLinkDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [reasonCode, setReasonCode] = useState("ops_decision");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setReasonCode("ops_decision");
      setReasonText("");
      setError(null);
      setHostedUrl(null);
      setCopied(false);
    }
  }, [open]);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "payment_link",
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    const url = (result.data?.hostedUrl as string) || null;
    setHostedUrl(url);
    if (!url) {
      onDone();
    }
  }

  async function copyUrl() {
    if (!hostedUrl) return;
    try {
      await navigator.clipboard.writeText(hostedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Payment link</DialogTitle>
          <DialogDescription>
            Create / refresh Stripe payment link for this booking.
          </DialogDescription>
        </DialogHeader>
        {!hostedUrl ? (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <ReasonSelect
                reasons={PAYMENT_OPS_REASONS}
                value={reasonCode}
                onChange={setReasonCode}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={2}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">Link ready — copy or open:</p>
            <p className="break-all rounded-md border border-border/60 bg-secondary/40 p-3 text-xs font-mono">
              {hostedUrl}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => void copyUrl()}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" className="flex-1" asChild>
                <a href={hostedUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </Button>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              if (hostedUrl) onDone();
            }}
            disabled={loading}
          >
            {hostedUrl ? "Done" : "Cancel"}
          </Button>
          {!hostedUrl && (
            <Button onClick={() => void submit()} disabled={loading || !reasonCode}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExtraChargeDialog({
  open,
  onOpenChange,
  bookingId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookingId: string;
  onDone: () => void;
}) {
  const [hoursExtra, setHoursExtra] = useState("1");
  const [amountPounds, setAmountPounds] = useState("");
  const [applyHoursNow, setApplyHoursNow] = useState(true);
  const [reasonCode, setReasonCode] = useState("extra_hours");
  const [reasonText, setReasonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setHoursExtra("1");
      setAmountPounds("");
      setApplyHoursNow(true);
      setReasonCode("extra_hours");
      setReasonText("");
      setError(null);
      setHostedUrl(null);
      setCopied(false);
    }
  }, [open]);

  async function submit() {
    const pounds = Number(amountPounds);
    if (!Number.isFinite(pounds) || pounds < 0.5) {
      setError("Minimum £0.50");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await postOps(bookingId, {
      action: "extra_charge",
      amountPence: Math.round(pounds * 100),
      hoursExtra: hoursExtra ? Number(hoursExtra) : null,
      applyHoursNow,
      reasonCode,
      reasonText,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Failed");
      return;
    }
    const url = (result.data?.hostedUrl as string) || null;
    setHostedUrl(url);
    if (!url) {
      onOpenChange(false);
      onDone();
    }
  }

  async function copyUrl() {
    if (!hostedUrl) return;
    try {
      await navigator.clipboard.writeText(hostedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sheetClass}>
        <DialogHeader>
          <DialogTitle>Extra charge</DialogTitle>
          <DialogDescription>
            Creates a Stripe invoice (new payment row). Does not change the original payment.
          </DialogDescription>
        </DialogHeader>
        {!hostedUrl ? (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Extra hours</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hoursExtra}
                  onChange={(e) => setHoursExtra(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (£)</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.01}
                  value={amountPounds}
                  onChange={(e) => setAmountPounds(e.target.value)}
                  className="h-11"
                  placeholder="0.00"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyHoursNow}
                onChange={(e) => setApplyHoursNow(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Add hours to booking now
            </label>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <ReasonSelect
                reasons={PAYMENT_OPS_REASONS}
                value={reasonCode}
                onChange={setReasonCode}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={2}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <p className="text-sm text-emerald-600">Invoice created and emailed (if possible).</p>
            <p className="break-all rounded-md border border-border/60 bg-secondary/40 p-3 text-xs font-mono">
              {hostedUrl}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => void copyUrl()}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" className="flex-1" asChild>
                <a href={hostedUrl} target="_blank" rel="noreferrer">
                  Open invoice
                </a>
              </Button>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              if (hostedUrl) onDone();
            }}
            disabled={loading}
          >
            {hostedUrl ? "Done" : "Cancel"}
          </Button>
          {!hostedUrl && (
            <Button
              onClick={() => void submit()}
              disabled={loading || !reasonCode || !amountPounds}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invoice
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
