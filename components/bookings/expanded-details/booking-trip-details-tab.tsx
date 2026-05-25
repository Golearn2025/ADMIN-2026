"use client";

import { AdditionalStopsSection } from "@/components/bookings/expanded-details/additional-stops-section";
import { FlightInfoSection } from "@/components/bookings/expanded-details/flight-info-section";
import { NotesSection } from "@/components/bookings/expanded-details/notes-section";
import { PaymentsHistorySection } from "@/components/bookings/expanded-details/payments-history-section";
import {
  IncludedServicesSection,
  PaidUpgradesSection,
  PremiumFeaturesSection,
} from "@/components/bookings/expanded-details/services-section";
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <DetailCard>
          <IncludedServicesSection services={extras.included_services_json || []} />
        </DetailCard>
        <DetailCard>
          <PaidUpgradesSection upgrades={extras.paid_upgrades_json || {}} />
        </DetailCard>
        <DetailCard>
          <PremiumFeaturesSection features={extras.premium_features_json || {}} />
        </DetailCard>
        <DetailCard>
          <TripPreferencesSection preferences={extras.trip_preferences_json} />
        </DetailCard>
        <DetailCard>
          <AdditionalStopsSection stops={extras.additional_stops_json} />
        </DetailCard>
        <DetailCard>
          <FlightInfoSection
            pickupFlightNumber={extras.flight_number_pickup}
            returnFlightNumber={extras.flight_number_return}
          />
        </DetailCard>
      </div>

      <DetailCard>
        <PaymentsHistorySection payments={payments} />
      </DetailCard>

      <DetailCard>
        <NotesSection
          internalNotes={extras.notes_internal}
          customRequirements={extras.custom_requirements_text}
        />
      </DetailCard>
    </div>
  );
}
