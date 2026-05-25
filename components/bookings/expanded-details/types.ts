export type BookingExtras = {
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
};

export type BookingPayment = {
  attempt_no: number;
  status: "pending" | "succeeded" | "failed";
  amount_pence: number;
  currency: string;
  stripe_payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
};
