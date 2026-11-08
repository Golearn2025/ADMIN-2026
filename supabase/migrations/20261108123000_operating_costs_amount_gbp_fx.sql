ALTER TABLE public.operating_costs
  ADD COLUMN IF NOT EXISTS amount_gbp_pence integer,
  ADD COLUMN IF NOT EXISTS fx_rate_to_gbp numeric,
  ADD COLUMN IF NOT EXISTS fx_as_of date;

COMMENT ON COLUMN public.operating_costs.amount_gbp_pence IS 'Invoice amount converted to GBP pence (ECB/Frankfurter on fx_as_of)';
COMMENT ON COLUMN public.operating_costs.fx_rate_to_gbp IS 'FX rate used: 1 unit of currency = fx_rate_to_gbp GBP';
COMMENT ON COLUMN public.operating_costs.fx_as_of IS 'Date of ECB rate applied';

UPDATE public.operating_costs
SET amount_gbp_pence = amount_pence,
    fx_rate_to_gbp = 1,
    fx_as_of = start_date
WHERE deleted_at IS NULL
  AND upper(currency) = 'GBP'
  AND amount_gbp_pence IS NULL;

DROP VIEW IF EXISTS public.admin_operating_cost_summary;
DROP VIEW IF EXISTS public.admin_operating_costs_list;

CREATE VIEW public.admin_operating_costs_list AS
SELECT
  c.id,
  c.organization_id,
  c.catalog_id,
  cat.slug AS catalog_slug,
  c.vendor_name,
  c.category,
  c.description,
  c.amount_pence,
  c.currency,
  c.amount_gbp_pence,
  c.fx_rate_to_gbp,
  c.fx_as_of,
  c.cadence,
  c.amortize_months,
  c.start_date,
  c.end_date,
  c.is_usage_based,
  c.invoice_ref,
  c.notes,
  c.status,
  c.payment_status,
  c.created_at,
  c.updated_at,
  CASE
    WHEN c.amortize_months IS NOT NULL AND c.amortize_months > 0
      THEN (c.amount_pence::numeric / c.amortize_months)::integer
    WHEN c.cadence = 'daily' THEN (c.amount_pence::numeric * 30.4375)::integer
    WHEN c.cadence = 'weekly' THEN (c.amount_pence::numeric * 52 / 12)::integer
    WHEN c.cadence = 'monthly' THEN c.amount_pence
    WHEN c.cadence = 'yearly' THEN (c.amount_pence::numeric / 12)::integer
    ELSE 0
  END AS monthly_equivalent_pence,
  CASE
    WHEN c.amortize_months IS NOT NULL AND c.amortize_months > 0
      THEN (c.amount_pence::numeric / (c.amortize_months * 30.4375))::integer
    WHEN c.cadence = 'daily' THEN c.amount_pence
    WHEN c.cadence = 'weekly' THEN (c.amount_pence::numeric / 7)::integer
    WHEN c.cadence = 'monthly' THEN (c.amount_pence::numeric / 30.4375)::integer
    WHEN c.cadence = 'yearly' THEN (c.amount_pence::numeric / 365.25)::integer
    ELSE 0
  END AS daily_equivalent_pence,
  CASE
    WHEN c.amortize_months IS NOT NULL AND c.amortize_months > 0
      THEN ((c.amount_pence::numeric / c.amortize_months) * 12)::integer
    WHEN c.cadence = 'daily' THEN (c.amount_pence::numeric * 365.25)::integer
    WHEN c.cadence = 'weekly' THEN (c.amount_pence::numeric * 52)::integer
    WHEN c.cadence = 'monthly' THEN c.amount_pence * 12
    WHEN c.cadence = 'yearly' THEN c.amount_pence
    ELSE 0
  END AS yearly_equivalent_pence
FROM public.operating_costs c
LEFT JOIN public.operating_cost_catalog cat ON cat.id = c.catalog_id
WHERE c.deleted_at IS NULL;

CREATE VIEW public.admin_operating_cost_summary AS
WITH base AS (
  SELECT * FROM public.admin_operating_costs_list
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
  coalesce(sum(coalesce(b.amount_gbp_pence, CASE WHEN upper(b.currency)='GBP' THEN b.amount_pence ELSE 0 END)), 0)::bigint AS cash_spent_pence,
  coalesce((
    SELECT sum(
      CASE
        WHEN br.amortize_months IS NOT NULL AND br.amortize_months > 0
          THEN (coalesce(br.amount_gbp_pence, CASE WHEN upper(br.currency)='GBP' THEN br.amount_pence ELSE 0 END)::numeric / br.amortize_months)
        WHEN br.cadence = 'daily'
          THEN (coalesce(br.amount_gbp_pence, CASE WHEN upper(br.currency)='GBP' THEN br.amount_pence ELSE 0 END)::numeric * 30.4375)
        WHEN br.cadence = 'weekly'
          THEN (coalesce(br.amount_gbp_pence, CASE WHEN upper(br.currency)='GBP' THEN br.amount_pence ELSE 0 END)::numeric * 52 / 12)
        WHEN br.cadence = 'monthly'
          THEN coalesce(br.amount_gbp_pence, CASE WHEN upper(br.currency)='GBP' THEN br.amount_pence ELSE 0 END)
        WHEN br.cadence = 'yearly'
          THEN (coalesce(br.amount_gbp_pence, CASE WHEN upper(br.currency)='GBP' THEN br.amount_pence ELSE 0 END)::numeric / 12)
        ELSE 0
      END
    )::bigint
    FROM burn_rows br WHERE br.organization_id = b.organization_id
  ), 0)::bigint AS monthly_burn_pence,
  0::bigint AS daily_burn_pence,
  0::bigint AS yearly_burn_pence,
  coalesce(sum(coalesce(b.amount_gbp_pence, CASE WHEN upper(b.currency)='GBP' THEN b.amount_pence ELSE 0 END)) FILTER (WHERE b.payment_status = 'unpaid'), 0)::bigint AS unpaid_pence,
  count(*) FILTER (WHERE b.payment_status = 'unpaid') AS unpaid_count
FROM base b
GROUP BY b.organization_id;
