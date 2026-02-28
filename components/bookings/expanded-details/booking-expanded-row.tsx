"use client";

import { ServicesSection } from "./services-section";
import { TripPreferencesSection } from "./trip-preferences-section";
import { AdditionalStopsSection } from "./additional-stops-section";
import { FlightInfoSection } from "./flight-info-section";
import { PaymentsHistorySection } from "./payments-history-section";
import { NotesSection } from "./notes-section";
import { Loader2 } from "lucide-react";

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

interface BookingExpandedRowProps {
  extras: BookingExtras | null;
  payments: Payment[] | null;
  loading: boolean;
}

export function BookingExpandedRow({ extras, payments, loading }: BookingExpandedRowProps) {
  if (loading) {
    return (
      <div className="bg-muted/30 border-t border-border">
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
        </div>
      </div>
    );
  }

  if (!extras || !payments) {
    return (
      <div className="bg-muted/30 border-t border-border">
        <div className="p-6 text-center text-sm text-muted-foreground">
          Failed to load booking details
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border-t border-border">
      <div className="p-6 grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
          <ServicesSection
            includedServices={extras.included_services_json || []}
            paidUpgrades={extras.paid_upgrades_json || {}}
            premiumFeatures={extras.premium_features_json || {}}
          />
          <TripPreferencesSection preferences={extras.trip_preferences_json} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <AdditionalStopsSection stops={extras.additional_stops_json} />
          <FlightInfoSection
            pickupFlightNumber={extras.flight_number_pickup}
            returnFlightNumber={extras.flight_number_return}
          />
        </div>

        <PaymentsHistorySection payments={payments || []} />

        <NotesSection
          internalNotes={extras.notes_internal}
          customRequirements={extras.custom_requirements_text}
        />
      </div>
    </div>
  );
}
