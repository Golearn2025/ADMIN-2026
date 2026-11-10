-- Dashboard SSOT: aggregate in Postgres (industry pattern).
-- Same rules as lib/dashboard/compute-stats.ts + charts route — no select * dump to Node.

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats_v1(
  p_organization_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT
      b.status,
      b.start_at,
      b.display_price_pence,
      b.latest_payment_status,
      b.assigned_driver_id,
      b.driver_name,
      b.trip_status
    FROM public.admin_booking_list b
    WHERE (p_organization_id IS NULL OR b.organization_id = p_organization_id)
      AND (p_from IS NULL OR b.start_at >= p_from)
      AND (p_to IS NULL OR b.start_at <= p_to)
  ),
  calc AS (
    SELECT
      COALESCE(SUM(display_price_pence) FILTER (
        WHERE latest_payment_status = 'succeeded'
      ), 0)::bigint AS total_revenue_pence,
      COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'CANCELLED')::int AS total_bookings,
      COUNT(*) FILTER (WHERE latest_payment_status = 'succeeded')::int AS paid_bookings,
      COUNT(*) FILTER (
        WHERE status IN ('CONFIRMED', 'COMPLETED')
      )::int AS confirmed_bookings,
      COUNT(*) FILTER (
        WHERE status IN ('NEW', 'PENDING_PAYMENT', 'AWAITING_INVOICE_CONFIRM')
      )::int AS pending_bookings,
      COUNT(*) FILTER (
        WHERE start_at IS NOT NULL
          AND start_at > now()
          AND status IS DISTINCT FROM 'CANCELLED'
      )::int AS scheduled_bookings,
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_bookings,
      COALESCE(SUM(display_price_pence) FILTER (
        WHERE status IS DISTINCT FROM 'CANCELLED'
      ), 0)::bigint AS incoming_value_pence,
      COUNT(*) FILTER (
        WHERE status IS DISTINCT FROM 'CANCELLED'
          AND (status = 'COMPLETED' OR trip_status = 'COMPLETED')
      )::int AS completed_bookings,
      COUNT(*) FILTER (
        WHERE status IS DISTINCT FROM 'CANCELLED'
          AND (assigned_driver_id IS NOT NULL OR nullif(trim(driver_name), '') IS NOT NULL)
      )::int AS assigned_bookings,
      COUNT(*) FILTER (
        WHERE status IS DISTINCT FROM 'CANCELLED'
          AND (assigned_driver_id IS NOT NULL OR nullif(trim(driver_name), '') IS NOT NULL)
          AND NOT (status = 'COMPLETED' OR trip_status = 'COMPLETED')
      )::int AS in_progress_bookings,
      COUNT(*) FILTER (
        WHERE status IS DISTINCT FROM 'CANCELLED'
          AND assigned_driver_id IS NULL
          AND nullif(trim(driver_name), '') IS NULL
          AND NOT (status = 'COMPLETED' OR trip_status = 'COMPLETED')
      )::int AS unassigned_bookings
    FROM filtered
  )
  SELECT jsonb_build_object(
    'total_revenue_pence', total_revenue_pence,
    'total_bookings', total_bookings,
    'avg_booking_value_pence', CASE
      WHEN paid_bookings > 0 THEN round(total_revenue_pence::numeric / paid_bookings)::bigint
      ELSE 0
    END,
    'confirmed_bookings', confirmed_bookings,
    'pending_bookings', pending_bookings,
    'scheduled_bookings', scheduled_bookings,
    'cancelled_bookings', cancelled_bookings,
    'paid_bookings', paid_bookings,
    'incoming_bookings', total_bookings,
    'incoming_value_pence', incoming_value_pence,
    'completed_bookings', completed_bookings,
    'in_progress_bookings', in_progress_bookings,
    'assigned_bookings', assigned_bookings,
    'unassigned_bookings', unassigned_bookings
  )
  FROM calc;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_charts_v1(
  p_organization_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT
      b.status,
      b.start_at,
      b.created_at,
      b.display_price_pence,
      b.latest_payment_status,
      b.booking_type,
      b.requested_vehicle_category_label
    FROM public.admin_booking_list b
    WHERE (p_organization_id IS NULL OR b.organization_id = p_organization_id)
      AND (p_from IS NULL OR b.start_at >= p_from)
      AND (p_to IS NULL OR b.start_at <= p_to)
  ),
  revenue_trend AS (
    SELECT
      (COALESCE(start_at, created_at) AT TIME ZONE 'UTC')::date AS day,
      SUM(display_price_pence)::bigint AS revenue_pence
    FROM filtered
    WHERE latest_payment_status = 'succeeded'
      AND COALESCE(start_at, created_at) IS NOT NULL
    GROUP BY 1
    ORDER BY 1
  ),
  booking_types AS (
    SELECT
      lower(COALESCE(booking_type::text, 'unknown')) AS type_id,
      COUNT(*)::int AS value
    FROM filtered
    WHERE status IS DISTINCT FROM 'CANCELLED'
    GROUP BY 1
  ),
  payment_status AS (
    SELECT
      upper(COALESCE(latest_payment_status, 'no_payment')) AS name,
      COUNT(*)::int AS value
    FROM filtered
    GROUP BY 1
  ),
  vehicle_categories AS (
    SELECT
      COALESCE(nullif(trim(requested_vehicle_category_label), ''), 'Not specified') AS name,
      COUNT(*)::int AS value
    FROM filtered
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'revenue_trend', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'date', day::text,
            'revenue', round(revenue_pence::numeric / 100.0, 2)
          )
          ORDER BY day
        )
        FROM revenue_trend
      ),
      '[]'::jsonb
    ),
    'booking_types_raw', COALESCE(
      (SELECT jsonb_object_agg(type_id, value) FROM booking_types),
      '{}'::jsonb
    ),
    'payment_status', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY name)
        FROM payment_status
      ),
      '[]'::jsonb
    ),
    'vehicle_categories', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('name', name, 'value', value) ORDER BY name)
        FROM vehicle_categories
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats_v1(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_charts_v1(uuid, timestamptz, timestamptz)
  TO authenticated, service_role;
