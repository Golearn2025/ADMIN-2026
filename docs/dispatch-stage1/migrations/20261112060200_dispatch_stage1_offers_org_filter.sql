-- =============================================================================
-- REVIEW ONLY — DO NOT APPLY WITHOUT EXPLICIT APPROVAL
-- Full recreation of public.driver_job_offers_v2 from LIVE VL NEW definition
-- (pg_get_viewdef 2026-11-12) + ONE change:
--   AND d.organization_id = bl.organization_id
-- inside the EXISTS (drivers d JOIN vehicles v ...) predicate.
-- Permissions today: SELECT/INSERT/UPDATE/DELETE for anon+authenticated+service_role
-- (view grants inherited broadly — do not tighten here without separate review).
-- =============================================================================

CREATE OR REPLACE VIEW public.driver_job_offers_v2 AS
WITH latest_payment AS (
         SELECT DISTINCT ON (bp.booking_id) bp.booking_id,
            bp.status AS payment_status
           FROM booking_payments bp
          WHERE bp.deleted_at IS NULL
          ORDER BY bp.booking_id, bp.created_at DESC
        ), fleet_summary AS (
         SELECT sub.booking_id,
            sum(sub.cat_total)::integer AS fleet_total_vehicles,
            sum(sub.cat_assigned)::integer AS fleet_total_assigned,
            jsonb_object_agg(sub.vehicle_category_id, jsonb_build_object('needed', sub.cat_total, 'assigned', sub.cat_assigned)) AS fleet_by_category
           FROM ( SELECT bl2.booking_id,
                    bl2.vehicle_category_id,
                    count(*)::integer AS cat_total,
                    count(bl2.assigned_driver_id)::integer AS cat_assigned
                   FROM booking_legs bl2
                     JOIN bookings b2 ON b2.id = bl2.booking_id
                  WHERE bl2.deleted_at IS NULL AND b2.booking_type = 'fleet'::booking_type AND b2.deleted_at IS NULL
                  GROUP BY bl2.booking_id, bl2.vehicle_category_id) sub
          GROUP BY sub.booking_id
        )
 SELECT bl.id AS job_id,
    bl.booking_id,
    bl.organization_id,
    b.reference AS booking_reference,
    b.booking_type,
    b.currency,
    bl.leg_number,
    bl.leg_kind,
    bl.status AS leg_status,
        CASE
            WHEN lower(COALESCE(bl.leg_kind::text, ''::text)) = 'return'::text THEN format_location_preview(COALESCE(b.trip_configuration_raw -> 'returnPickup'::text, b.trip_configuration_raw -> 'dropoff'::text))
            ELSE format_location_preview(b.trip_configuration_raw -> 'pickup'::text)
        END AS pickup_preview,
        CASE
            WHEN lower(COALESCE(bl.leg_kind::text, ''::text)) = 'return'::text THEN format_location_preview(COALESCE(b.trip_configuration_raw -> 'returnDropoff'::text, b.trip_configuration_raw -> 'pickup'::text))
            ELSE format_location_preview(b.trip_configuration_raw -> 'dropoff'::text)
        END AS dropoff_preview,
    bl.pickup_lat,
    bl.pickup_lng,
    bl.dropoff_lat,
    bl.dropoff_lng,
    bl.distance_miles,
    bl.duration_min,
    bl.vehicle_category_id,
    bl.vehicle_model_id,
    bl.scheduled_at,
    bl.created_at,
    b.passenger_count,
    b.bag_count,
    b.custom_requirements AS notes,
    b.hours_requested,
    b.days_requested,
    driver_offer_base_payout_for_leg(bl.id, bl.scheduled_at, bl.organization_id) AS driver_payout_pence,
    b.currency AS payout_currency,
    resolve_payout_tier_factor(bl.scheduled_at, bl.organization_id, resolve_driver_payout_tier_group(b.booking_type::text, b.hours_requested, b.days_requested), bl.vehicle_category_id) AS current_payout_factor,
    GREATEST(EXTRACT(epoch FROM bl.scheduled_at - now()) / 3600.0, 0::numeric) AS hours_until_job,
    bl.flight_number,
    bl.preferences AS preferences_json,
    fs.fleet_total_vehicles,
    fs.fleet_total_assigned,
    fs.fleet_by_category,
    COALESCE(stop_agg.stops_count, 0) AS stops_count,
    COALESCE(stop_agg.stops_preview, '[]'::jsonb) AS stops_preview,
    COALESCE(addons_agg.addons_by_group, '{}'::jsonb) AS addons_by_group,
    COALESCE(upgrades_agg.paid_upgrades_enriched, '[]'::jsonb) AS paid_upgrades_enriched,
    COALESCE(upgrades_agg.paid_extras_pence, 0) AS paid_extras_pence,
    partner.scheduled_at AS partner_leg_scheduled_at,
    b.end_at AS booking_end_at
   FROM booking_legs bl
     JOIN bookings b ON b.id = bl.booking_id AND b.deleted_at IS NULL AND b.status = 'CONFIRMED'::booking_status
     JOIN latest_payment lp ON lp.booking_id = b.id AND lp.payment_status = 'succeeded'::payment_status
     LEFT JOIN fleet_summary fs ON fs.booking_id = b.id
     LEFT JOIN LATERAL ( SELECT bl2.scheduled_at
           FROM booking_legs bl2
          WHERE bl2.booking_id = bl.booking_id AND bl2.id <> bl.id AND bl2.deleted_at IS NULL
          ORDER BY bl2.leg_number
         LIMIT 1) partner ON true
     LEFT JOIN LATERAL ( SELECT count(*)::integer AS stops_count,
            jsonb_agg(jsonb_build_object('stop_order', s.ord, 'lat', ((s.item -> 'coordinates'::text) ->> 'lat'::text)::numeric, 'lng', ((s.item -> 'coordinates'::text) ->> 'lng'::text)::numeric, 'preview', COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' • '::text, NULLIF(TRIM(BOTH FROM s.item ->> 'outcode'::text), ''::text), NULLIF(TRIM(BOTH FROM s.item ->> 'city'::text), ''::text))), ''::text), NULLIF(TRIM(BOTH FROM s.item ->> 'area'::text), ''::text), 'Stop'::text)) ORDER BY s.ord) AS stops_preview
           FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(bl.stops_raw) = 'array'::text THEN bl.stops_raw
                    ELSE '[]'::jsonb
                END) WITH ORDINALITY s(item, ord)) stop_agg ON true
     LEFT JOIN LATERAL ( SELECT jsonb_object_agg(g.item_group, g.names) AS addons_by_group
           FROM ( SELECT si.item_group,
                    jsonb_agg(si.name ORDER BY si.display_order) AS names
                   FROM jsonb_array_elements_text(
                        CASE
                            WHEN jsonb_typeof(bl.addons) = 'array'::text THEN bl.addons
                            ELSE '[]'::jsonb
                        END) ak(value)
                     JOIN service_items si ON si.id = ak.value AND si.is_active = true
                  GROUP BY si.item_group) g) addons_agg ON true
     LEFT JOIN LATERAL ( SELECT enrich_paid_upgrades_enriched(bl.addons, b.trip_configuration_raw) AS paid_upgrades_enriched,
            sum_paid_upgrades_driver_pence(bl.addons, b.trip_configuration_raw) AS paid_extras_pence) upgrades_agg ON true
  WHERE bl.deleted_at IS NULL AND bl.status = 'PENDING'::leg_status AND bl.assigned_driver_id IS NULL AND bl.scheduled_at >= (now() - '01:00:00'::interval) AND (EXISTS ( SELECT 1
           FROM drivers d
             JOIN vehicles v ON v.driver_id = d.id AND v.status = 'active'::text AND v.deleted_at IS NULL
          WHERE d.auth_user_id = auth.uid() AND d.deleted_at IS NULL AND d.organization_id = bl.organization_id AND (bl.vehicle_model_id IS NOT NULL AND v.model_id = bl.vehicle_model_id OR bl.vehicle_model_id IS NULL AND bl.vehicle_category_id IS NOT NULL AND v.category_id = bl.vehicle_category_id) AND job_offer_wave_allows_driver(bl.id, d.id)));

COMMENT ON VIEW public.driver_job_offers_v2 IS
  'REVIEW: live body + org filter on EXISTS; wave+vehicle match unchanged.';
