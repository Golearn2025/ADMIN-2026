"use client";

import type { BookingExtras, BookingPayment } from "@/components/bookings/expanded-details/types";
import type { BookingEconomicsResponse } from "@/lib/bookings/economics/types";
import { useEffect, useState } from "react";

export type BookingLegRow = {
  leg_number: number;
  leg_role: string;
  scheduled_at: string;
  pickup_address: string;
  dropoff_address: string;
  assigned_driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  assigned_vehicle_id: string | null;
  vehicle_plate: string | null;
  vehicle_make_model: string | null;
};

export type FleetSlotRow = {
  slot_number: number;
  slot_status: string;
  requested_vehicle_category_label: string;
  requested_vehicle_model_label: string;
  assigned_driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  assigned_vehicle_id: string | null;
  vehicle_plate: string | null;
  vehicle_make_model: string | null;
};

type UseBookingExpandedDataArgs = {
  bookingId: string;
  isReturn: boolean;
  isFleet: boolean;
};

export function useBookingExpandedData({
  bookingId,
  isReturn,
  isFleet,
}: UseBookingExpandedDataArgs) {
  const [legs, setLegs] = useState<BookingLegRow[]>([]);
  const [slots, setSlots] = useState<FleetSlotRow[]>([]);
  const [extras, setExtras] = useState<BookingExtras | null>(null);
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [economics, setEconomics] = useState<BookingEconomicsResponse | null>(null);
  const [economicsError, setEconomicsError] = useState<string | null>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStructure = async () => {
      if (!isReturn && !isFleet) return;

      setIsLoadingStructure(true);
      try {
        const path = isReturn
          ? `/api/admin/bookings/${bookingId}/legs`
          : `/api/admin/bookings/${bookingId}/fleet-slots`;
        const response = await fetch(path, { signal: controller.signal });
        const result = await response.json();
        if (response.ok) {
          if (isReturn) setLegs(result.data || []);
          else setSlots(result.data || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching booking structure:", error);
        }
      } finally {
        setIsLoadingStructure(false);
      }
    };

    void fetchStructure();
    return () => controller.abort();
  }, [bookingId, isReturn, isFleet]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const [extrasRes, paymentsRes, economicsRes] = await Promise.all([
          fetch(`/api/admin/bookings/${bookingId}/extras`, { signal: controller.signal }),
          fetch(`/api/admin/bookings/${bookingId}/payments`, { signal: controller.signal }),
          fetch(`/api/admin/bookings/${bookingId}/economics`, { signal: controller.signal }),
        ]);

        if (extrasRes.ok) setExtras(await extrasRes.json());
        if (paymentsRes.ok) setPayments((await paymentsRes.json()) || []);

        if (economicsRes.ok) {
          setEconomics((await economicsRes.json()) as BookingEconomicsResponse);
          setEconomicsError(null);
        } else {
          const errBody = await economicsRes.json().catch(() => ({}));
          setEconomics(null);
          setEconomicsError(
            typeof errBody?.error === "string" ? errBody.error : "Failed to load booking economics"
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching booking details:", error);
        }
      } finally {
        setIsLoadingDetails(false);
      }
    };

    void fetchDetails();
    return () => controller.abort();
  }, [bookingId]);

  return {
    legs,
    slots,
    extras,
    payments,
    economics,
    economicsError,
    isLoadingStructure,
    isLoadingDetails,
  };
}
