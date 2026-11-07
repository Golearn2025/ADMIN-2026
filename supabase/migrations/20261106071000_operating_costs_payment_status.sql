-- payment_status: paid | unpaid (separate from active/ended lifecycle)
ALTER TABLE public.operating_costs
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('paid', 'unpaid'));

COMMENT ON COLUMN public.operating_costs.payment_status IS 'Invoice payment state: paid or unpaid';

-- Must drop: Postgres cannot insert a column mid-view with CREATE OR REPLACE
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
SELECT
  organization_id,
  count(*) FILTER (WHERE status = 'active') AS active_count,
  count(*) FILTER (WHERE cadence = 'one_time') AS one_time_count,
  coalesce(sum(amount_pence), 0)::bigint AS cash_spent_pence,
  coalesce(sum(monthly_equivalent_pence) FILTER (WHERE status = 'active'), 0)::bigint AS monthly_burn_pence,
  coalesce(sum(daily_equivalent_pence) FILTER (WHERE status = 'active'), 0)::bigint AS daily_burn_pence,
  coalesce(sum(yearly_equivalent_pence) FILTER (WHERE status = 'active'), 0)::bigint AS yearly_burn_pence,
  coalesce(sum(amount_pence) FILTER (WHERE payment_status = 'unpaid'), 0)::bigint AS unpaid_pence,
  count(*) FILTER (WHERE payment_status = 'unpaid') AS unpaid_count
FROM public.admin_operating_costs_list
GROUP BY organization_id;

-- Drive-imported Supabase invoices are already paid
UPDATE public.operating_costs
SET payment_status = 'paid', updated_at = now()
WHERE invoice_ref LIKE 'supabase-invoice:PWVZRR-%'
  AND deleted_at IS NULL;
