"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { TripForm, BookingType, LocationPoint } from "@/hooks/use-new-job";
import { PlacesAutocomplete } from "@/components/jobs/places-autocomplete";
import { DateTimeField } from "@/components/jobs/datetime-field";
import { cn } from "@/lib/utils";

interface StepTripProps {
  value: TripForm;
  onChange: (v: TripForm) => void;
  onNext: () => void;
  onPrev: () => void;
}

const BOOKING_TYPES: { id: BookingType; label: string; desc: string }[] = [
  { id: "oneway", label: "One-way", desc: "A → B" },
  { id: "return", label: "Return", desc: "A → B → A" },
  { id: "hourly", label: "Hourly", desc: "Hours" },
  { id: "daily", label: "Daily", desc: "Days" },
  { id: "fleet", label: "Fleet", desc: "Multi-vehicle" },
];


export function StepTrip({ value, onChange, onNext, onPrev }: StepTripProps) {
  const needsDropoff = value.bookingType === "oneway" || value.bookingType === "return";
  const isHourly = value.bookingType === "hourly";
  const isDaily = value.bookingType === "daily";
  const isReturn = value.bookingType === "return";
  const isFleet = value.bookingType === "fleet";

  function addStop() {
    onChange({ ...value, stops: [...value.stops, null as unknown as LocationPoint] });
  }

  function removeStop(idx: number) {
    onChange({ ...value, stops: value.stops.filter((_, i) => i !== idx) });
  }

  function updateStop(idx: number, loc: LocationPoint | null) {
    const stops = [...value.stops];
    stops[idx] = loc as LocationPoint;
    onChange({ ...value, stops });
  }

  const pickupOk = !!value.pickup?.address && value.pickup.lat !== 0;
  const dropoffOk = !!value.dropoff?.address && value.dropoff.lat !== 0;

  const canProceed =
    !!value.scheduledAt &&
    pickupOk &&
    (isHourly || isDaily || isFleet || dropoffOk);

  return (
    <div className="space-y-5">
      {/* Booking type selector */}
      <div>
        <Label>Trip type</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {BOOKING_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ ...value, bookingType: t.id })}
              className={cn(
                "flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                value.bookingType === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              <span className="font-semibold">{t.label}</span>
              <span className="opacity-70">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pickup */}
      <PlacesAutocomplete
        label="Pickup"
        value={value.pickup}
        onChange={(v) => onChange({ ...value, pickup: v })}
        placeholder="ex: Heathrow Terminal 5, Hounslow"
        required
      />

      {/* Stops (not for hourly/daily) */}
      {!isHourly && !isDaily && (
        <div className="space-y-2">
          {value.stops.map((stop, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <PlacesAutocomplete
                label={`Stop ${idx + 1}`}
                value={stop || null}
                onChange={(loc) => updateStop(idx, loc)}
                placeholder="ex: Paddington Station, London"
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon" className="mb-0.5 shrink-0" onClick={() => removeStop(idx)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStop}
            className="w-full text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> Add stop
          </Button>
        </div>
      )}

      {/* Dropoff */}
      {needsDropoff && (
        <PlacesAutocomplete
          label="Dropoff"
          value={value.dropoff}
          onChange={(v) => onChange({ ...value, dropoff: v })}
          placeholder="ex: 10 Downing Street, London"
          required
        />
      )}

      {/* Return date */}
      {isReturn && (
        <DateTimeField
          label={
            <>
              Return date & time <span className="text-destructive">*</span>
            </>
          }
          value={value.returnAt}
          onChange={(v) => onChange({ ...value, returnAt: v })}
          required
        />
      )}

      {/* Hours / Days */}
      {isHourly && (
        <div>
          <Label>Hours requested</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={value.hours}
            onChange={(e) => onChange({ ...value, hours: Number(e.target.value) })}
            className="mt-1 w-32"
          />
        </div>
      )}
      {isDaily && (
        <div>
          <Label>Days requested</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={value.days}
            onChange={(e) => onChange({ ...value, days: Number(e.target.value) })}
            className="mt-1 w-32"
          />
        </div>
      )}

      {/* Fleet note */}
      {isFleet && (
        <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
          Fleet mode: select the vehicle in the next step. Each vehicle gets a separate leg.
        </p>
      )}

      {/* Date / time */}
      <DateTimeField
        label={
          <>
            Date & time {isReturn ? "(outbound)" : ""} <span className="text-destructive">*</span>
          </>
        }
        value={value.scheduledAt}
        onChange={(v) => onChange({ ...value, scheduledAt: v })}
        required
      />

      {/* Passengers & bags */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Passengers</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={value.passengers}
            onChange={(e) => onChange({ ...value, passengers: Number(e.target.value) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Bags</Label>
          <Input
            type="number"
            min={0}
            max={20}
            value={value.bags}
            onChange={(e) => onChange({ ...value, bags: Number(e.target.value) })}
            className="mt-1"
          />
        </div>
      </div>

      {/* Flight number */}
      <div>
        <Label>Flight number (optional)</Label>
        <Input
          placeholder="ex: BA256"
          value={value.flightNumber}
          onChange={(e) => onChange({ ...value, flightNumber: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Notes */}
      <div>
        <Label>Special requirements (optional)</Label>
        <Input
          placeholder="e.g. child seat, meet & greet sign..."
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          className="mt-1"
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onPrev}>← Back</Button>
        <Button className="flex-1" disabled={!canProceed} onClick={onNext}>Continue →</Button>
      </div>
    </div>
  );
}
