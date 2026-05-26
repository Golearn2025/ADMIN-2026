"use client";

import { AdditionalStopsSection } from "@/components/bookings/expanded-details/additional-stops-section";
import { FlightInfoSection } from "@/components/bookings/expanded-details/flight-info-section";
import { NotesSection } from "@/components/bookings/expanded-details/notes-section";
import { PaymentsHistorySection } from "@/components/bookings/expanded-details/payments-history-section";
import { PaidUpgradesSection } from "@/components/bookings/expanded-details/services-section";
import { TripPreferencesSection } from "@/components/bookings/expanded-details/trip-preferences-section";
import type { BookingExtras, BookingPayment } from "./types";

type BookingTripDetailsTabProps = {
  extras: BookingExtras | null;
  payments: BookingPayment[];
  extrasError?: boolean;
};

function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-3 sm:p-4 shadow-sm">
      {children}
    </div>
  );
}

function hasPaidUpgrades(upgrades: Record<string, unknown>): boolean {
  if (!upgrades || typeof upgrades !== "object") return false;
  return Object.keys(upgrades).length > 0;
}

function hasPreferences(
  prefs: BookingExtras["trip_preferences_json"]
): boolean {
  if (!prefs || typeof prefs !== "object") return false;
  return Object.values(prefs).some(
    (v) => typeof v === "string" && v.trim() && v !== "no-preference"
  );
}

function hasStops(stops: BookingExtras["additional_stops_json"]): boolean {
  return Array.isArray(stops) && stops.length > 0;
}

function hasFlights(extras: BookingExtras): boolean {
  return Boolean(
    extras.flight_number_pickup?.trim() || extras.flight_number_return?.trim()
  );
}

function hasNotes(extras: BookingExtras): boolean {
  return Boolean(
    extras.notes_internal?.trim() || extras.custom_requirements_text?.trim()
  );
}

export function BookingTripDetailsTab({
  extras,
  payments,
  extrasError,
}: BookingTripDetailsTabProps) {
  if (extrasError || !extras) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Unable to load trip extras for this booking.
      </p>
    );
  }

  const showPaid = hasPaidUpgrades(extras.paid_upgrades_json || {});
  const showPrefs = hasPreferences(extras.trip_preferences_json);
  const showStops = hasStops(extras.additional_stops_json);
  const showFlights = hasFlights(extras);
  const showNotes = hasNotes(extras);

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground border border-border/40 rounded-md px-3 py-2 bg-muted/5">
        Fare breakdown (base fare, distance, congestion, hourly, VAT…) is in the{" "}
        <span className="font-medium text-foreground">Economics &amp; pricing → Pricing engine</span>{" "}
        tab. Included catalog extras at £0 are not listed here.
      </p>

      {(showPaid || showPrefs || showStops || showFlights) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {showPaid && (
            <DetailCard>
              <PaidUpgradesSection upgrades={extras.paid_upgrades_json || {}} />
            </DetailCard>
          )}
          {showPrefs && (
            <DetailCard>
              <TripPreferencesSection preferences={extras.trip_preferences_json} />
            </DetailCard>
          )}
          {showStops && (
            <DetailCard>
              <AdditionalStopsSection stops={extras.additional_stops_json} />
            </DetailCard>
          )}
          {showFlights && (
            <DetailCard>
              <FlightInfoSection
                pickupFlightNumber={extras.flight_number_pickup}
                returnFlightNumber={extras.flight_number_return}
              />
            </DetailCard>
          )}
        </div>
      )}

      {!showPaid && !showPrefs && !showStops && !showFlights && (
        <p className="text-xs text-muted-foreground italic text-center py-2">
          No paid upgrades or trip preferences on this booking.
        </p>
      )}

      <DetailCard>
        <PaymentsHistorySection payments={payments} />
      </DetailCard>

      {showNotes && (
        <DetailCard>
          <NotesSection
            internalNotes={extras.notes_internal}
            customRequirements={extras.custom_requirements_text}
          />
        </DetailCard>
      )}
    </div>
  );
}
