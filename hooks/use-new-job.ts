"use client";

import { useState, useCallback } from "react";
import { londonLocalToUtcIso } from "@/lib/utils/london-datetime";

export type BookingType = "oneway" | "return" | "hourly" | "daily" | "fleet";

export interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface CustomerForm {
  mode: "existing" | "new";
  customerId?: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface TripForm {
  bookingType: BookingType;
  pickup: LocationPoint | null;
  dropoff: LocationPoint | null;
  stops: LocationPoint[];
  scheduledAt: string;      // datetime-local wall clock (Europe/London)
  returnAt: string;         // datetime-local wall clock (Europe/London)
  hours: number;            // for hourly
  days: number;             // for daily
  passengers: number;
  bags: number;
  flightNumber: string;
  notes: string;
}

export interface VehicleForm {
  categoryId: string;
  /** Empty string = category-only (all drivers in category). Specific id locks to that model. */
  modelId: string;
}

export interface PriceForm {
  quoteId: string | null;
  quotedPrice: number | null;      // from engine (GBP) — client price incl. VAT when configured
  priceOverride: number | null;    // manual client price override (GBP)
  driverPayout: number | null;     // manual driver payout (GBP) — what driver sees
  currency: string;
  priceBeforeVAT: number | null;
  vatAmount: number | null;
  vatRate: number | null;
  breakdown: Record<string, number> | null;
  legDetails: Array<{ legNumber: number; distance: number | null; duration: number | null }> | null;
}

export type WizardStep = "customer" | "trip" | "vehicle" | "price" | "confirm";
export type DispatchMode = "open" | "direct";

export type DispatchForm = {
  mode: DispatchMode;
  exclusiveDriverId: string;
  exclusiveDriverName: string;
};

const STEPS: WizardStep[] = ["customer", "trip", "vehicle", "price", "confirm"];

const defaultTrip: TripForm = {
  bookingType: "oneway",
  pickup: null,
  dropoff: null,
  stops: [],
  scheduledAt: "",
  returnAt: "",
  hours: 3,
  days: 1,
  passengers: 1,
  bags: 0,
  flightNumber: "",
  notes: "",
};

export function useNewJob() {
  const [step, setStep] = useState<WizardStep>("customer");
  const [customer, setCustomer] = useState<CustomerForm>({
    mode: "new",
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
  });
  const [trip, setTrip] = useState<TripForm>(defaultTrip);
  const [vehicle, setVehicle] = useState<VehicleForm>({ categoryId: "executive", modelId: "mercedes-e-class" });
  const [price, setPrice] = useState<PriceForm>({
    quoteId: null,
    quotedPrice: null,
    priceOverride: null,
    driverPayout: null,
    currency: "GBP",
    priceBeforeVAT: null,
    vatAmount: null,
    vatRate: null,
    breakdown: null,
    legDetails: null,
  });

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [dispatch, setDispatch] = useState<DispatchForm>({
    mode: "open",
    exclusiveDriverId: "",
    exclusiveDriverName: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<{ bookingId: string; reference: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: "paid" | "link"; message: string; url?: string } | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const goNext = useCallback(() => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }, [stepIndex]);

  const goPrev = useCallback(() => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }, [stepIndex]);

  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const body = buildQuotePayload(trip, vehicle);
      const res = await fetch("/api/admin/jobs/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Quote failed");
      }

      const q = data.data || data;
      const pricing = q.pricing ?? {};
      const rawLegs = pricing.legs ?? q.legs ?? [];
      const routeMetrics =
        (pricing.routeMetrics as Record<string, unknown> | null | undefined) ??
        (q.routeMetrics as Record<string, unknown> | null | undefined) ??
        null;
      const toNum = (value: unknown): number | null => {
        if (value == null || value === "") return null;
        const n = typeof value === "number" ? value : Number(value);
        return Number.isFinite(n) ? n : null;
      };
      const fallbackMiles = toNum(
        routeMetrics?.fullDistance ?? routeMetrics?.full_distance_miles
      );
      const fallbackMins = toNum(
        routeMetrics?.fullDuration ?? routeMetrics?.full_duration_minutes
      );
      let legDetails = Array.isArray(rawLegs)
        ? rawLegs.map((leg: Record<string, unknown>, index: number) => {
            const miles =
              leg.distance_miles ??
              leg.distanceMiles ??
              leg.distance;
            const mins =
              leg.duration_min ??
              leg.durationMin ??
              leg.duration_minutes ??
              leg.duration;
            return {
              legNumber: Number(leg.legNumber ?? leg.leg_number ?? index + 1),
              distance: toNum(miles),
              duration: toNum(mins),
            };
          })
        : null;
      // One-way legacy path used to omit miles/mins on legs — fill from routeMetrics
      if (
        legDetails &&
        legDetails.length > 0 &&
        legDetails.every((l) => l.distance == null && l.duration == null) &&
        (fallbackMiles != null || fallbackMins != null)
      ) {
        legDetails = [
          {
            legNumber: legDetails[0]?.legNumber ?? 1,
            distance: fallbackMiles,
            duration: fallbackMins,
          },
        ];
      } else if (
        (!legDetails || legDetails.length === 0) &&
        (fallbackMiles != null || fallbackMins != null)
      ) {
        legDetails = [{ legNumber: 1, distance: fallbackMiles, duration: fallbackMins }];
      }
      // Drop empty placeholder rows so UI does not show "Leg 1: — · —"
      if (legDetails) {
        legDetails = legDetails.filter((l) => l.distance != null || l.duration != null);
        if (legDetails.length === 0) legDetails = null;
      }
      const engineBreakdown =
        pricing.breakdown && typeof pricing.breakdown === "object"
          ? (pricing.breakdown as Record<string, unknown>)
          : null;
      // Flatten numeric fee fields only (ignore nested objects like multipliers/details).
      const flatBreakdown: Record<string, number> = {};
      if (engineBreakdown) {
        for (const [key, value] of Object.entries(engineBreakdown)) {
          const n = toNum(value);
          if (n != null) flatBreakdown[key] = n;
        }
      }
      setPrice({
        quoteId: q.quoteId,
        quotedPrice: toNum(pricing.finalPrice),
        priceOverride: null,
        driverPayout: null,
        currency: pricing.currency || "GBP",
        priceBeforeVAT: toNum(pricing.priceBeforeVAT),
        vatAmount: toNum(pricing.vatAmount),
        vatRate: toNum(pricing.vatRate),
        breakdown: Object.keys(flatBreakdown).length > 0 ? flatBreakdown : null,
        legDetails,
      });
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Quote error");
    } finally {
      setQuoteLoading(false);
    }
  }, [trip, vehicle]);

  const createJob = useCallback(async () => {
    if (!price.quoteId) {
      setCreateError("No quote — calculate price first");
      return;
    }
    if (dispatch.mode === "direct" && !dispatch.exclusiveDriverId) {
      setCreateError("Select a driver for Direct mode");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: price.quoteId,
          customer: {
            customerId: customer.mode === "existing" ? customer.customerId : undefined,
            email: customer.email,
            phone: customer.phone,
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
          priceOverride: price.priceOverride,
          driverPayout: price.driverPayout,
          legDetails: price.legDetails, // distance + duration per leg → driver payout calc
          passengers: trip.passengers,
          bags: trip.bags,
          notes: trip.notes?.trim() || null,
          flightNumber: trip.flightNumber?.trim() || null,
          dispatchMode: dispatch.mode,
          exclusiveDriverId:
            dispatch.mode === "direct" ? dispatch.exclusiveDriverId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Create failed");

      setCreatedBooking({ bookingId: data.bookingId, reference: data.reference });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create error");
    } finally {
      setCreateLoading(false);
    }
  }, [price, customer, trip, dispatch]);

  const markPaid = useCallback(async () => {
    if (!createdBooking) return;
    if (dispatch.mode === "direct" && !dispatch.exclusiveDriverId) {
      setActionResult({ type: "paid", message: "Select a driver for Direct mode" });
      return;
    }
    setActionLoading(true);
    try {
      const amountPence = Math.round((price.priceOverride ?? price.quotedPrice ?? 0) * 100);
      const res = await fetch("/api/admin/jobs/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: createdBooking.bookingId,
          amountPence,
          dispatchMode: dispatch.mode,
          exclusiveDriverId:
            dispatch.mode === "direct" ? dispatch.exclusiveDriverId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Mark paid failed");
      setActionResult({
        type: "paid",
        message:
          data.message ||
          (dispatch.mode === "direct"
            ? `Job reserved for ${dispatch.exclusiveDriverName || "selected driver"} only`
            : "Job confirmed & published to drivers!"),
      });
    } catch (err) {
      setActionResult({ type: "paid", message: err instanceof Error ? err.message : "Error" });
    } finally {
      setActionLoading(false);
    }
  }, [createdBooking, price, dispatch]);

  const sendPaymentLink = useCallback(async () => {
    if (!createdBooking) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/jobs/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: createdBooking.bookingId,
          customerId: customer.customerId,
          email: customer.email,
          quoteId: price.quoteId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Payment link failed");
      setActionResult({
        type: "link",
        message: "Payment link generated!",
        url: data.hostedUrl || data.clientSecret,
      });
    } catch (err) {
      setActionResult({ type: "link", message: err instanceof Error ? err.message : "Error" });
    } finally {
      setActionLoading(false);
    }
  }, [createdBooking, customer, price]);

  return {
    step, stepIndex, STEPS,
    goNext, goPrev, setStep,
    customer, setCustomer,
    trip, setTrip,
    vehicle, setVehicle,
    price, setPrice,
    dispatch, setDispatch,
    quoteLoading, quoteError, fetchQuote,
    createLoading, createError, createJob,
    createdBooking,
    actionLoading, actionResult,
    markPaid, sendPaymentLink,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQuotePayload(trip: TripForm, vehicle: VehicleForm) {
  // datetime-local is UK wall clock — convert to UTC ISO for pricing/booking
  const dateTimeUtc = trip.scheduledAt ? londonLocalToUtcIso(trip.scheduledAt) : trip.scheduledAt;
  const returnUtc = trip.returnAt ? londonLocalToUtcIso(trip.returnAt) : trip.returnAt;

  const base = {
    bookingType: trip.bookingType,
    pickup: trip.pickup ? locationToPoint(trip.pickup) : undefined,
    dropoff: trip.dropoff ? locationToPoint(trip.dropoff) : undefined,
    additionalStops: trip.stops.map(locationToPoint),
    dateTime: dateTimeUtc,
    vehicleType: vehicle.categoryId,
    // Omit / null model → booking_legs.vehicle_model_id stays NULL →
    // all drivers in the category can see the job (admin WhatsApp quotes).
    vehicleModel: vehicle.modelId?.trim() ? vehicle.modelId : null,
    passengers: trip.passengers,
    luggage: trip.bags,
    flightNumber: trip.flightNumber || undefined,
    customRequirements: trip.notes || undefined,
    organizationId: "9a5caade-4791-4860-93b5-12b1c4fa9830",
    distance: null,
    duration: null,
  };

  if (trip.bookingType === "return") {
    return { ...base, returnDateTime: returnUtc };
  }
  if (trip.bookingType === "hourly") {
    return { ...base, hours: trip.hours };
  }
  if (trip.bookingType === "daily") {
    return { ...base, days: trip.days };
  }
  return base;
}

function locationToPoint(loc: LocationPoint) {
  return {
    address: loc.address,
    coordinates: [loc.lat, loc.lng] as [number, number],
    placeId: loc.placeId || null,
  };
}
