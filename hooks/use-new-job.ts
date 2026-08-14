"use client";

import { useState, useCallback } from "react";

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
  scheduledAt: string;      // ISO
  returnAt: string;         // ISO (for return type)
  hours: number;            // for hourly
  days: number;             // for daily
  passengers: number;
  bags: number;
  flightNumber: string;
  notes: string;
}

export interface VehicleForm {
  categoryId: string;
  modelId: string;
}

export interface PriceForm {
  quoteId: string | null;
  quotedPrice: number | null;      // from engine (GBP) — client price
  priceOverride: number | null;    // manual client price override (GBP)
  driverPayout: number | null;     // manual driver payout (GBP) — what driver sees
  currency: string;
  breakdown: Record<string, number> | null;
  legDetails: Array<{ legNumber: number; pickup: string; dropoff: string; distance: number; duration: number }> | null;
}

export type WizardStep = "customer" | "trip" | "vehicle" | "price" | "confirm";

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
    breakdown: null,
    legDetails: null,
  });

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
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
      setPrice({
        quoteId: q.quoteId,
        quotedPrice: q.pricing?.finalPrice ?? null,
        priceOverride: null,
        driverPayout: null,
        currency: q.pricing?.currency || "GBP",
        breakdown: q.pricing?.breakdown || null,
        legDetails: q.legs || null,
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
  }, [price, customer]);

  const markPaid = useCallback(async () => {
    if (!createdBooking) return;
    setActionLoading(true);
    try {
      const amountPence = Math.round((price.priceOverride ?? price.quotedPrice ?? 0) * 100);
      const res = await fetch("/api/admin/jobs/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: createdBooking.bookingId, amountPence }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Mark paid failed");
      setActionResult({ type: "paid", message: "Job confirmed & published to drivers!" });
    } catch (err) {
      setActionResult({ type: "paid", message: err instanceof Error ? err.message : "Error" });
    } finally {
      setActionLoading(false);
    }
  }, [createdBooking, price]);

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
    quoteLoading, quoteError, fetchQuote,
    createLoading, createError, createJob,
    createdBooking,
    actionLoading, actionResult,
    markPaid, sendPaymentLink,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildQuotePayload(trip: TripForm, vehicle: VehicleForm) {
  const base = {
    bookingType: trip.bookingType,
    pickup: trip.pickup ? locationToPoint(trip.pickup) : undefined,
    dropoff: trip.dropoff ? locationToPoint(trip.dropoff) : undefined,
    additionalStops: trip.stops.map(locationToPoint),
    dateTime: trip.scheduledAt,
    vehicleType: vehicle.categoryId,
    vehicleModel: vehicle.modelId,
    passengers: trip.passengers,
    luggage: trip.bags,
    flightNumber: trip.flightNumber || undefined,
    customRequirements: trip.notes || undefined,
    organizationId: "9a5caade-4791-4860-93b5-12b1c4fa9830",
    distance: null,
    duration: null,
  };

  if (trip.bookingType === "return") {
    return { ...base, returnDateTime: trip.returnAt };
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
