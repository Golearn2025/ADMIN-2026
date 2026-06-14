export type TripType = "airport_pickup" | "airport_dropoff" | "distance" | "hourly" | "daily";
export type DistanceBand = "short" | "medium" | "long" | "very_long";
export type VehicleCategory = "executive" | "luxury" | "suv" | "mpv";
export type PriceRole = "vl_actual" | "vl_target" | "competitor";

export interface MarketCompetitor {
  id: string;
  organization_id: string;
  name: string;
  website_url: string;
  runs_google_ads: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketSavedPlace {
  id: string;
  organization_id: string;
  label: string;
  address_text: string;
  sort_order: number;
  created_at: string;
}

export interface MarketRouteTemplate {
  id: string;
  organization_id: string;
  name: string;
  trip_type: TripType;
  distance_band: DistanceBand | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  airport_code: string | null;
  distance_miles: number | null;
  duration_minutes: number | null;
  hourly_billed_hours: number | null;
  daily_included_hours: number | null;
  daily_days: number | null;
  sort_order: number;
  is_active: boolean;
  is_core: boolean;
  created_at: string;
  updated_at: string;
  scenarios?: MarketScenario[];
}

export interface MarketScenario {
  id: string;
  route_template_id: string;
  vehicle_category_id: VehicleCategory;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  route_template?: MarketRouteTemplate;
}

export interface MarketCheck {
  id: string;
  organization_id: string;
  label: string | null;
  quote_datetime: string;
  checked_at: string;
  checked_by_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface MarketCheckPrice {
  id: string;
  check_id: string;
  scenario_id: string;
  price_role: PriceRole;
  competitor_id: string | null;
  amount_pence: number;
  extra_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketPricingSettings {
  id: string;
  organization_id: string;
  aggressive_pct: number;
  premium_pct: number;
  equal_tolerance_pence: number;
}

// ── Derived / computed types ──────────────────────────────────────────────────

export interface ScenarioPriceRow {
  scenario: MarketScenario;
  vl_actual_pence: number | null;
  vl_target_pence: number | null;
  competitor_prices: Array<{
    competitor: MarketCompetitor;
    amount_pence: number;
    extra_hours: number | null;
    notes: string | null;
  }>;
}

export interface MarketStats {
  min_pence: number | null;
  max_pence: number | null;
  median_pence: number | null;
  mean_pence: number | null;
  count: number;
  cheapest_competitor_name: string | null;
}

export interface CompetitorGap {
  competitor: MarketCompetitor;
  rank: number;
  amount_pence: number;
  delta_pence: number;       // VL - competitor (positive = VL more expensive)
  delta_pct: number;         // %
  label: string;             // "+£14 (+7,9%)"
  to_equal_pence: number;    // abs delta to equal this competitor
  vl_is_cheaper: boolean;
}

export interface PriceRecommendations {
  match_min_pence: number | null;
  match_median_pence: number | null;
  match_max_pence: number | null;
  aggressive_pence: number | null;   // min × aggressive_pct
  premium_pence: number | null;      // min × premium_pct
}

export type MarketPosition = "cheaper" | "in_line" | "premium" | "expensive";
