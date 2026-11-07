-- Align admin Flight Info with real quote/booking payload keys.
-- Website/admin quotes store flightNumber (and returnFlightNumber);
-- older UI keys flightNumberPickup / flightNumberReturn were often empty.
-- Also fall back to booking_legs.flight_number (main / return).

CREATE OR REPLACE VIEW public.admin_booking_extras AS
SELECT
  b.id AS booking_id,
  b.organization_id,
  b.reference,
  b.booking_type,
  b.fleet_mode,
  b.status,
  b.currency,
  b.notes_internal,
  COALESCE(b.custom_requirements, ''::text) AS custom_requirements_text,
  COALESCE(b.trip_configuration_raw #>> '{customRequirements}'::text[], ''::text) AS custom_requirements_json,
  COALESCE(
    NULLIF(TRIM(BOTH FROM COALESCE(b.trip_configuration_raw #>> '{flightNumberPickup}'::text[], '')), ''),
    NULLIF(TRIM(BOTH FROM COALESCE(b.trip_configuration_raw #>> '{flightNumber}'::text[], '')), ''),
    (
      SELECT NULLIF(TRIM(BOTH FROM bl.flight_number), '')
      FROM public.booking_legs bl
      WHERE bl.booking_id = b.id
        AND bl.deleted_at IS NULL
        AND (
          lower(COALESCE(bl.leg_kind::text, '')) = 'main'
          OR bl.leg_number = 1
        )
      ORDER BY bl.leg_number
      LIMIT 1
    ),
    ''::text
  ) AS flight_number_pickup,
  COALESCE(
    NULLIF(TRIM(BOTH FROM COALESCE(b.trip_configuration_raw #>> '{flightNumberReturn}'::text[], '')), ''),
    NULLIF(TRIM(BOTH FROM COALESCE(b.trip_configuration_raw #>> '{returnFlightNumber}'::text[], '')), ''),
    (
      SELECT NULLIF(TRIM(BOTH FROM bl.flight_number), '')
      FROM public.booking_legs bl
      WHERE bl.booking_id = b.id
        AND bl.deleted_at IS NULL
        AND lower(COALESCE(bl.leg_kind::text, '')) = 'return'
      ORDER BY bl.leg_number
      LIMIT 1
    ),
    ''::text
  ) AS flight_number_return,
  COALESCE(b.trip_configuration_raw #> '{servicePackages,includedServices}'::text[], '[]'::jsonb) AS included_services_json,
  COALESCE(b.trip_configuration_raw #> '{servicePackages,paidUpgrades}'::text[], '{}'::jsonb) AS paid_upgrades_json,
  COALESCE(b.trip_configuration_raw #> '{servicePackages,premiumFeatures}'::text[], '{}'::jsonb) AS premium_features_json,
  COALESCE(b.trip_configuration_raw #> '{servicePackages,tripPreferences}'::text[], '{}'::jsonb) AS trip_preferences_json,
  COALESCE(b.trip_configuration_raw #> '{additionalStops}'::text[], '[]'::jsonb) AS additional_stops_json,
  COALESCE(b.trip_configuration_raw #> '{fleetSelection}'::text[], '{}'::jsonb) AS fleet_selection_json
FROM public.bookings b
WHERE b.deleted_at IS NULL;
