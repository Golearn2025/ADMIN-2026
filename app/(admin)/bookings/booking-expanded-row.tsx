import { BookingEconomicsPanel } from "@/components/bookings/economics";
import { AdditionalStopsSection } from "@/components/bookings/expanded-details/additional-stops-section";
import { FlightInfoSection } from "@/components/bookings/expanded-details/flight-info-section";
import { NotesSection } from "@/components/bookings/expanded-details/notes-section";
import { PaymentsHistorySection } from "@/components/bookings/expanded-details/payments-history-section";
import { IncludedServicesSection, PaidUpgradesSection, PremiumFeaturesSection } from "@/components/bookings/expanded-details/services-section";
import { TripPreferencesSection } from "@/components/bookings/expanded-details/trip-preferences-section";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { useEffect, useState } from "react";
import { BookingDetailsBar } from "./booking-details-bar";
import { FleetSlotsTable } from "./fleet-slots-table";
import { ReturnLegsTable } from "./return-legs-table";
import type { Booking } from "./types";
import type { BookingEconomicsResponse } from "@/lib/bookings/economics/types";

interface BookingExpandedRowProps {
  booking: Booking;
}

interface BookingLeg {
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
}

interface FleetSlot {
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
}

interface BookingExtras {
  included_services_json: string[];
  paid_upgrades_json: Record<string, unknown>;
  premium_features_json: Record<string, unknown>;
  trip_preferences_json: {
    music?: string;
    temperature?: string;
    communication?: string;
  } | null;
  additional_stops_json: Array<{ address: string; order?: number }> | null;
  flight_number_pickup?: string | null;
  flight_number_return?: string | null;
  custom_requirements_text?: string | null;
  notes_internal?: string | null;
}

interface Payment {
  attempt_no: number;
  status: "pending" | "succeeded" | "failed";
  amount_pence: number;
  currency: string;
  stripe_payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
}

export function BookingExpandedRow({ booking }: BookingExpandedRowProps) {
  const [legs, setLegs] = useState<BookingLeg[]>([]);
  const [slots, setSlots] = useState<FleetSlot[]>([]);
  const [extras, setExtras] = useState<BookingExtras | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [economics, setEconomics] = useState<BookingEconomicsResponse | null>(null);
  const [economicsError, setEconomicsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const isReturn = booking.booking_type === "return";
  const isFleet = booking.booking_type === "fleet";

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      if (!isReturn && !isFleet) {
        return;
      }

      setIsLoading(true);
      try {
        if (isReturn) {
          const response = await fetch(`/api/admin/bookings/${booking.id}/legs`, {
            signal: controller.signal,
          });
          const result = await response.json();
          if (response.ok) {
            setLegs(result.data || []);
          }
        } else if (isFleet) {
          const response = await fetch(`/api/admin/bookings/${booking.id}/fleet-slots`, {
            signal: controller.signal,
          });
          const result = await response.json();
          console.log('🚗 Fleet slots API response:', {
            bookingId: booking.id,
            response: result,
            dataLength: result?.data?.length || 0
          });
          if (response.ok) {
            setSlots(result.data || []);
          } else {
            console.error('❌ Fleet slots API error:', result);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error fetching expanded data:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [booking.id, isReturn, isFleet]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const [extrasRes, paymentsRes, economicsRes] = await Promise.all([
          fetch(`/api/admin/bookings/${booking.id}/extras`, {
            signal: controller.signal,
          }),
          fetch(`/api/admin/bookings/${booking.id}/payments`, {
            signal: controller.signal,
          }),
          fetch(`/api/admin/bookings/${booking.id}/economics`, {
            signal: controller.signal,
          }),
        ]);

        if (extrasRes.ok) {
          const extrasData = await extrasRes.json();
          setExtras(extrasData);
        }

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData || []);
        }

        if (economicsRes.ok) {
          const economicsData = (await economicsRes.json()) as BookingEconomicsResponse;
          setEconomics(economicsData);
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

    fetchDetails();

    return () => controller.abort();
  }, [booking.id]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <LoadingSkeleton variant="table" rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Return: Legs Table + Detalii */}
      {isReturn && legs.length > 0 && (
        <>
          <ReturnLegsTable legs={legs} />
          {/* Detalii suplimentare SUB tabel */}
          <div className="border-t border-border pt-6">
            <BookingDetailsBar booking={booking} />
          </div>
        </>
      )}

      {/* Fleet: Slots Table + Detalii */}
      {isFleet && slots.length > 0 && (
        <>
          <FleetSlotsTable slots={slots} />
          {/* Detalii suplimentare SUB tabel */}
          <div className="border-t border-border pt-6">
            <BookingDetailsBar booking={booking} />
          </div>
        </>
      )}

      {/* Pentru alte booking types (oneway, hourly, daily, bespoke): Doar detalii */}
      {!isReturn && !isFleet && <BookingDetailsBar booking={booking} />}

      {/* Secțiuni suplimentare (extras + payments) pentru toate booking types */}
      <div className="border-t border-border pt-4">
        {isLoadingDetails ? (
          <div className="h-20 bg-muted/20 animate-pulse rounded" />
        ) : extras ? (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Row 1: Services breakdown - 3 carduri */}
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <IncludedServicesSection services={extras.included_services_json || []} />
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <PaidUpgradesSection upgrades={extras.paid_upgrades_json || {}} />
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <PremiumFeaturesSection features={extras.premium_features_json || {}} />
            </div>

            {/* Row 1: Preferences + Stops + Flights */}
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <TripPreferencesSection preferences={extras.trip_preferences_json} />
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <AdditionalStopsSection stops={extras.additional_stops_json} />
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <FlightInfoSection
                pickupFlightNumber={extras.flight_number_pickup}
                returnFlightNumber={extras.flight_number_return}
              />
            </div>

            {/* Row 2: Booking economics full width */}
            <div className="md:col-span-6 bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <BookingEconomicsPanel
                data={economics}
                loading={isLoadingDetails}
                error={economicsError}
              />
            </div>

            {/* Row 3: Payments full width */}
            <div className="md:col-span-6 bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <PaymentsHistorySection payments={payments} />
            </div>

            {/* Row 3: Notes full width */}
            <div className="md:col-span-6 bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <NotesSection
                internalNotes={extras.notes_internal}
                customRequirements={extras.custom_requirements_text}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center py-2">
              Unable to load booking extras
            </p>
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <BookingEconomicsPanel data={economics} loading={false} error={economicsError} />
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-3 shadow-sm">
              <PaymentsHistorySection payments={payments} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
