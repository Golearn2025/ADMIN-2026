-- Clone Vantage Lane v2 pricing → Cecconi's partner org.
-- Safe: idempotent, does NOT modify Vantage Lane, new version starts inactive.

DO $$
DECLARE
  src_version_id uuid := '788745f6-5115-482f-9a88-91b0783893c4';
  src_org_id uuid := '9a5caade-4791-4860-93b5-12b1c4fa9830';
  tgt_org_id uuid := '49cabd50-8b59-4089-b2b2-bc4d2570b2f9';
  new_version_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pricing_versions
    WHERE organization_id = tgt_org_id
      AND version_name = 'Cecconi''s Corporate'
  ) THEN
    RAISE NOTICE 'Cecconi''s Corporate pricing version already exists — skipping clone.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pricing_versions
    WHERE id = src_version_id
      AND organization_id = src_org_id
      AND version_name = 'v2'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Source v2 not found or not active on Vantage Lane — aborting.';
  END IF;

  new_version_id := gen_random_uuid();

  INSERT INTO pricing_versions (
    id,
    organization_id,
    version_name,
    description,
    is_active,
    valid_from,
    valid_until,
    version_number,
    is_published,
    effective_from,
    effective_until,
    notes,
    enable_dual_quote_stop_logic,
    stop_grace_threshold_miles,
    stop_grace_threshold_minutes,
    multi_stop_fee_pence,
    stop_pricing_notes,
    driver_pricing_factor,
    driver_min_payout_pence,
    driver_max_payout_pence
  )
  SELECT
    new_version_id,
    tgt_org_id,
    'Cecconi''s Corporate',
    'Corporate pricing for Cecconi''s — cloned from Vantage Lane v2',
    false,
    valid_from,
    valid_until,
    1,
    true,
    now(),
    effective_until,
    'Cloned from Vantage Lane v2 on 2026-07-14. Edit in Admin → Prices (org: Cecconi''s), then activate.',
    enable_dual_quote_stop_logic,
    stop_grace_threshold_miles,
    stop_grace_threshold_minutes,
    multi_stop_fee_pence,
    stop_pricing_notes,
    driver_pricing_factor,
    driver_min_payout_pence,
    driver_max_payout_pence
  FROM pricing_versions
  WHERE id = src_version_id;

  INSERT INTO pricing_vehicle_rates (
    id, organization_id, vehicle_category_id, booking_type,
    base_fare_pence, per_mile_first_6_pence, per_mile_after_6_pence, per_minute_pence,
    hourly_rate_pence, daily_rate_pence, minimum_fare_pence, currency, active,
    created_at, updated_at, pricing_version_id, driver_min_payout_pence, driver_max_payout_pence
  )
  SELECT
    gen_random_uuid(), tgt_org_id, vehicle_category_id, booking_type,
    base_fare_pence, per_mile_first_6_pence, per_mile_after_6_pence, per_minute_pence,
    hourly_rate_pence, daily_rate_pence, minimum_fare_pence, currency, active,
    now(), now(), new_version_id, driver_min_payout_pence, driver_max_payout_pence
  FROM pricing_vehicle_rates
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO pricing_hourly_rules (
    id, organization_id, vehicle_category_id, minimum_hours, maximum_hours,
    billing_increment_hours, active, created_at, pricing_version_id
  )
  SELECT
    gen_random_uuid(), tgt_org_id, vehicle_category_id, minimum_hours, maximum_hours,
    billing_increment_hours, active, now(), new_version_id
  FROM pricing_hourly_rules
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO pricing_daily_rules (
    id, organization_id, vehicle_category_id, minimum_days, maximum_days,
    included_hours, extra_hour_rate_pence, included_miles, extra_mile_rate_pence,
    active, created_at, pricing_version_id
  )
  SELECT
    gen_random_uuid(), tgt_org_id, vehicle_category_id, minimum_days, maximum_days,
    included_hours, extra_hour_rate_pence, included_miles, extra_mile_rate_pence,
    active, now(), new_version_id
  FROM pricing_daily_rules
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO pricing_time_rules (
    id, organization_id, rule_name, day_of_week, start_time, end_time,
    multiplier, active, created_at, pricing_version_id
  )
  SELECT
    gen_random_uuid(), tgt_org_id, rule_name, day_of_week, start_time, end_time,
    multiplier, active, now(), new_version_id
  FROM pricing_time_rules
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO pricing_airport_fees (
    id, organization_id, airport_code, pickup_fee_pence, dropoff_fee_pence,
    parking_fee_pence, included_wait_minutes, extra_wait_per_minute_pence,
    parking_allowance_pence, active, created_at, pricing_version_id
  )
  SELECT
    gen_random_uuid(), tgt_org_id, airport_code, pickup_fee_pence, dropoff_fee_pence,
    parking_fee_pence, included_wait_minutes, extra_wait_per_minute_pence,
    parking_allowance_pence, active, now(), new_version_id
  FROM pricing_airport_fees
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO pricing_zone_fees (
    id, organization_id, zone_code, fee_pence, active, created_at, pricing_version_id
  )
  SELECT
    gen_random_uuid(), tgt_org_id, zone_code, fee_pence, active, now(), new_version_id
  FROM pricing_zone_fees
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO pricing_rounding_rules (
    id, organization_id, rounding_step_pence, rounding_mode, created_at, pricing_version_id
  )
  SELECT
    gen_random_uuid(), tgt_org_id, rounding_step_pence, rounding_mode, now(), new_version_id
  FROM pricing_rounding_rules
  WHERE pricing_version_id = src_version_id AND organization_id = src_org_id;

  INSERT INTO payout_escalation_tiers (
    id, pricing_version_id, tier_group, vehicle_category_id, label,
    min_hours_before_job, max_hours_before_job, driver_payout_factor,
    sort_order, is_active, created_at
  )
  SELECT
    gen_random_uuid(), new_version_id, tier_group, vehicle_category_id, label,
    min_hours_before_job, max_hours_before_job, driver_payout_factor,
    sort_order, is_active, now()
  FROM payout_escalation_tiers
  WHERE pricing_version_id = src_version_id;

  -- Org-scoped rules (not versioned) — only if Cecconi's has none yet
  IF NOT EXISTS (SELECT 1 FROM pricing_return_rules WHERE organization_id = tgt_org_id) THEN
    INSERT INTO pricing_return_rules (id, organization_id, discount_percent, active, created_at)
    SELECT gen_random_uuid(), tgt_org_id, discount_percent, active, now()
    FROM pricing_return_rules
    WHERE organization_id = src_org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pricing_fleet_discounts WHERE organization_id = tgt_org_id) THEN
    INSERT INTO pricing_fleet_discounts (id, organization_id, min_vehicles, discount_percent, active, created_at)
    SELECT gen_random_uuid(), tgt_org_id, min_vehicles, discount_percent, active, now()
    FROM pricing_fleet_discounts
    WHERE organization_id = src_org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pricing_commission_profiles WHERE organization_id = tgt_org_id) THEN
    INSERT INTO pricing_commission_profiles (
      id, organization_id, platform_fee_percent, operator_fee_percent, active, created_at
    )
    SELECT gen_random_uuid(), tgt_org_id, platform_fee_percent, operator_fee_percent, active, now()
    FROM pricing_commission_profiles
    WHERE organization_id = src_org_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organization_settings WHERE organization_id = tgt_org_id) THEN
    INSERT INTO organization_settings (
      organization_id, timezone, operating_hours, platform_commission_pct,
      operator_commission_pct, pricing_source, pricing_profile_key,
      created_at, updated_at, vat_rate, currency, booking_lead_time_hours,
      max_advance_booking_days
    )
    SELECT
      tgt_org_id, timezone, operating_hours, platform_commission_pct,
      operator_commission_pct, pricing_source, pricing_profile_key,
      now(), now(), vat_rate, currency, booking_lead_time_hours,
      max_advance_booking_days
    FROM organization_settings
    WHERE organization_id = src_org_id;
  END IF;

  RAISE NOTICE 'Cecconi''s Corporate pricing cloned. New version_id: %', new_version_id;
END $$;
