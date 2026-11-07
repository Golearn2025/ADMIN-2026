-- Operating costs ledger (SSOT views for admin Finance)
-- Applied remotely; kept in repo for parity.

CREATE TABLE IF NOT EXISTS public.operating_cost_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'software',
  suggested_cadence text NOT NULL DEFAULT 'monthly',
  is_usage_based boolean NOT NULL DEFAULT false,
  search_hint text,
  website_url text,
  sort_order int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operating_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  catalog_id uuid REFERENCES public.operating_cost_catalog(id),
  vendor_name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  amount_pence integer NOT NULL CHECK (amount_pence >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  cadence text NOT NULL DEFAULT 'monthly'
    CHECK (cadence IN ('one_time','daily','weekly','monthly','yearly','multi_year')),
  amortize_months integer CHECK (amortize_months IS NULL OR amortize_months > 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_usage_based boolean NOT NULL DEFAULT false,
  invoice_ref text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE OR REPLACE VIEW public.admin_operating_costs_list AS
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

CREATE OR REPLACE VIEW public.admin_operating_cost_summary AS
SELECT
  organization_id,
  count(*) FILTER (WHERE status = 'active') AS active_count,
  count(*) FILTER (WHERE cadence = 'one_time') AS one_time_count,
  coalesce(sum(amount_pence), 0)::bigint AS cash_spent_pence,
  coalesce(sum(monthly_equivalent_pence) FILTER (WHERE status = 'active'), 0)::bigint AS monthly_burn_pence,
  coalesce(sum(daily_equivalent_pence) FILTER (WHERE status = 'active'), 0)::bigint AS daily_burn_pence,
  coalesce(sum(yearly_equivalent_pence) FILTER (WHERE status = 'active'), 0)::bigint AS yearly_burn_pence
FROM public.admin_operating_costs_list
GROUP BY organization_id;

CREATE OR REPLACE VIEW public.admin_operating_cost_catalog AS
SELECT
  id AS catalog_id,
  slug,
  name,
  category,
  suggested_cadence,
  is_usage_based,
  search_hint,
  website_url,
  sort_order
FROM public.operating_cost_catalog
WHERE is_active = true;
