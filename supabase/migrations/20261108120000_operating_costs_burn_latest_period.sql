-- Burn was summing EVERY historical monthly invoice (14x Krystal, 10x Render, etc.).
-- For recurring monthly rows, only the latest start_date per vendor+currency counts.
-- Multiple rows on the same latest date (e.g. Supabase plan + addon) still all count.

DROP VIEW IF EXISTS public.admin_operating_cost_summary;

CREATE VIEW public.admin_operating_cost_summary AS
WITH base AS (
  SELECT *
  FROM public.admin_operating_costs_list
),
monthly_latest AS (
  SELECT organization_id, lower(vendor_name) AS vendor_key, currency, max(start_date) AS latest_start
  FROM base
  WHERE status = 'active' AND cadence = 'monthly'
  GROUP BY organization_id, lower(vendor_name), currency
),
burn_rows AS (
  SELECT b.*
  FROM base b
  LEFT JOIN monthly_latest m
    ON m.organization_id = b.organization_id
   AND m.vendor_key = lower(b.vendor_name)
   AND m.currency = b.currency
  WHERE b.status = 'active'
    AND (
      b.cadence <> 'monthly'
      OR (b.cadence = 'monthly' AND b.start_date = m.latest_start)
    )
)
SELECT
  b.organization_id,
  count(*) FILTER (WHERE b.status = 'active') AS active_count,
  count(*) FILTER (WHERE b.cadence = 'one_time') AS one_time_count,
  coalesce(sum(b.amount_pence), 0)::bigint AS cash_spent_pence,
  coalesce((
    SELECT sum(br.monthly_equivalent_pence)::bigint FROM burn_rows br WHERE br.organization_id = b.organization_id
  ), 0)::bigint AS monthly_burn_pence,
  coalesce((
    SELECT sum(br.daily_equivalent_pence)::bigint FROM burn_rows br WHERE br.organization_id = b.organization_id
  ), 0)::bigint AS daily_burn_pence,
  coalesce((
    SELECT sum(br.yearly_equivalent_pence)::bigint FROM burn_rows br WHERE br.organization_id = b.organization_id
  ), 0)::bigint AS yearly_burn_pence,
  coalesce(sum(b.amount_pence) FILTER (WHERE b.payment_status = 'unpaid'), 0)::bigint AS unpaid_pence,
  count(*) FILTER (WHERE b.payment_status = 'unpaid') AS unpaid_count
FROM base b
GROUP BY b.organization_id;
