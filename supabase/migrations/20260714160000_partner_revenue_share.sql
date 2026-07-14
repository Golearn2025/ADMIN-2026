-- Partner revenue share: modular config + tiers, IBF snapshot columns, analytics views.
-- Cecconi's seed tiers: 3% / 5% / 10% by monthly booking volume.

BEGIN;

-- ─── 1. Config (one row per partner org) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_revenue_share_configs (
  organization_id uuid PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  share_basis text NOT NULL DEFAULT 'contribution_margin'
    CHECK (share_basis IN ('contribution_margin', 'client_net', 'platform_margin')),
  tier_period text NOT NULL DEFAULT 'calendar_month'
    CHECK (tier_period IN ('calendar_month', 'rolling_30d')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE partner_revenue_share_configs IS
  'Partner org revenue share settings (restaurants/hotels). Separate from operator_commission (PHV).';

-- ─── 2. Volume tiers (many rows per partner org) ─────────────────────────────

CREATE TABLE IF NOT EXISTS partner_revenue_share_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  min_bookings integer NOT NULL DEFAULT 0 CHECK (min_bookings >= 0),
  max_bookings integer CHECK (max_bookings IS NULL OR max_bookings >= min_bookings),
  share_pct numeric(8, 6) NOT NULL CHECK (share_pct >= 0 AND share_pct <= 1),
  sort_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_partner_revenue_share_tiers_org
  ON partner_revenue_share_tiers (organization_id, is_active, sort_order);

COMMENT ON TABLE partner_revenue_share_tiers IS
  'Volume-based partner share tiers per organization (e.g. 1-10 trips → 3%).';

-- ─── 3. Immutable snapshot columns on booking financials ─────────────────────

ALTER TABLE internal_booking_financials
  ADD COLUMN IF NOT EXISTS contribution_margin_pence integer,
  ADD COLUMN IF NOT EXISTS estimated_driver_marketplace_pence integer,
  ADD COLUMN IF NOT EXISTS partner_share_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_share_rate_bp integer,
  ADD COLUMN IF NOT EXISTS partner_tier_booking_count integer,
  ADD COLUMN IF NOT EXISTS vantage_lane_retained_pence integer;

COMMENT ON COLUMN internal_booking_financials.contribution_margin_pence IS
  'client_net − driver marketplace − processor fee (estimate at snapshot).';
COMMENT ON COLUMN internal_booking_financials.partner_share_pence IS
  'Partner org share frozen at booking confirmation.';
COMMENT ON COLUMN internal_booking_financials.vantage_lane_retained_pence IS
  'contribution_margin − partner_share at snapshot time.';

-- ─── 4. Seed Cecconi's ───────────────────────────────────────────────────────

INSERT INTO partner_revenue_share_configs (organization_id, is_enabled, share_basis, tier_period)
SELECT o.id, true, 'contribution_margin', 'calendar_month'
FROM organizations o
WHERE o.name = 'Cecconi''s' AND o.org_type = 'partner'
ON CONFLICT (organization_id) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  share_basis = EXCLUDED.share_basis,
  tier_period = EXCLUDED.tier_period,
  updated_at = now();

INSERT INTO partner_revenue_share_tiers (
  organization_id, min_bookings, max_bookings, share_pct, sort_order, is_active
)
SELECT o.id, t.min_bookings, t.max_bookings, t.share_pct, t.sort_order, true
FROM organizations o
CROSS JOIN (
  VALUES
    (1, 10, 0.03::numeric, 1),
    (11, 50, 0.05::numeric, 2),
    (51, 200, 0.10::numeric, 3)
) AS t(min_bookings, max_bookings, share_pct, sort_order)
WHERE o.name = 'Cecconi''s' AND o.org_type = 'partner'
  AND NOT EXISTS (
    SELECT 1 FROM partner_revenue_share_tiers existing
    WHERE existing.organization_id = o.id
  );

-- ─── 5. Helper: count qualifying bookings in calendar month ──────────────────

CREATE OR REPLACE FUNCTION count_partner_period_bookings(
  p_organization_id uuid,
  p_at timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM bookings b
  WHERE b.organization_id = p_organization_id
    AND b.deleted_at IS NULL
    AND b.status IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')
    AND date_trunc('month', b.created_at) = date_trunc('month', p_at);
$$;

-- ─── 6. Latest financial row per booking (extended) ──────────────────────────

DROP VIEW IF EXISTS partner_org_earnings_v1 CASCADE;
DROP VIEW IF EXISTS admin_platform_earnings_v1 CASCADE;
DROP VIEW IF EXISTS admin_org_earnings_summary_v1 CASCADE;
DROP VIEW IF EXISTS admin_booking_earnings_v1 CASCADE;
DROP VIEW IF EXISTS admin_latest_booking_financials CASCADE;

CREATE VIEW admin_latest_booking_financials AS
SELECT DISTINCT ON (booking_id)
  id AS financial_id,
  booking_id,
  organization_id,
  version,
  currency,
  gross_amount_pence,
  vat_amount_pence,
  subtotal_ex_vat_pence,
  platform_fee_pence,
  platform_fee_rate_bp,
  operator_fee_pence,
  operator_fee_rate_bp,
  processor_fee_pence,
  vendor_cost_pence,
  driver_payout_pence,
  driver_target_payout_pence,
  driver_final_payout_pence,
  estimated_driver_marketplace_pence,
  contribution_margin_pence,
  partner_share_pence,
  partner_share_rate_bp,
  partner_tier_booking_count,
  vantage_lane_retained_pence,
  gross_margin_pence,
  net_margin_pence,
  platform_profit_pence,
  pricing_source,
  calculated_at,
  created_at AS financial_created_at,
  line_items
FROM internal_booking_financials
ORDER BY booking_id, version DESC, calculated_at DESC, created_at DESC;

-- ─── 7. Per-booking earnings (SSOT read) ─────────────────────────────────────

CREATE VIEW admin_booking_earnings_v1 AS
SELECT
  b.id AS booking_id,
  b.reference,
  b.organization_id,
  o.name AS organization_name,
  o.org_type,
  b.status AS booking_status,
  b.created_at AS booking_at,
  date_trunc('month', b.created_at)::date AS period_month,
  lf.financial_id,
  coalesce(lf.gross_amount_pence, 0) AS client_gross_pence,
  coalesce(lf.vat_amount_pence, 0) AS vat_pence,
  coalesce(lf.subtotal_ex_vat_pence, 0) AS client_net_pence,
  coalesce(
    lf.estimated_driver_marketplace_pence,
    lf.driver_final_payout_pence,
    lf.driver_target_payout_pence,
    lf.driver_payout_pence,
    0
  ) AS driver_payout_pence,
  coalesce(lf.processor_fee_pence, 0) AS processor_fee_pence,
  coalesce(lf.contribution_margin_pence, 0) AS contribution_margin_pence,
  coalesce(lf.partner_share_pence, 0) AS partner_share_pence,
  lf.partner_share_rate_bp,
  lf.partner_tier_booking_count,
  coalesce(lf.vantage_lane_retained_pence, 0) AS vantage_lane_retained_pence,
  lf.calculated_at AS financial_calculated_at
FROM bookings b
JOIN organizations o ON o.id = b.organization_id
LEFT JOIN admin_latest_booking_financials lf ON lf.booking_id = b.id
WHERE b.deleted_at IS NULL;

-- ─── 8. Per-org monthly summary ──────────────────────────────────────────────

CREATE VIEW admin_org_earnings_summary_v1 AS
SELECT
  organization_id,
  organization_name,
  org_type,
  period_month,
  count(*) FILTER (WHERE financial_id IS NOT NULL) AS booking_count,
  coalesce(sum(client_gross_pence), 0)::bigint AS total_client_gross_pence,
  coalesce(sum(client_net_pence), 0)::bigint AS total_client_net_pence,
  coalesce(sum(driver_payout_pence), 0)::bigint AS total_driver_payout_pence,
  coalesce(sum(processor_fee_pence), 0)::bigint AS total_processor_fee_pence,
  coalesce(sum(partner_share_pence), 0)::bigint AS total_partner_share_pence,
  coalesce(sum(vantage_lane_retained_pence), 0)::bigint AS total_vantage_lane_retained_pence,
  coalesce(sum(contribution_margin_pence), 0)::bigint AS total_contribution_margin_pence
FROM admin_booking_earnings_v1
WHERE financial_id IS NOT NULL
GROUP BY organization_id, organization_name, org_type, period_month;

-- ─── 9. Platform rollup ──────────────────────────────────────────────────────

CREATE VIEW admin_platform_earnings_v1 AS
SELECT
  period_month,
  sum(booking_count)::bigint AS total_bookings,
  sum(total_client_gross_pence)::bigint AS total_client_gross_pence,
  sum(total_client_net_pence)::bigint AS total_client_net_pence,
  sum(total_driver_payout_pence)::bigint AS total_driver_payout_pence,
  sum(total_processor_fee_pence)::bigint AS total_processor_fee_pence,
  sum(total_partner_share_pence)::bigint AS total_partner_share_pence,
  sum(total_vantage_lane_retained_pence)::bigint AS total_vantage_lane_retained_pence
FROM admin_org_earnings_summary_v1
GROUP BY period_month;

-- ─── 10. Partner-scoped view (Cristi dashboard — partner share only) ─────────

CREATE VIEW partner_org_earnings_v1 AS
SELECT
  organization_id,
  organization_name,
  period_month,
  booking_count,
  total_client_net_pence,
  total_partner_share_pence AS partner_earned_pence,
  total_client_net_pence AS revenue_generated_pence
FROM admin_org_earnings_summary_v1
WHERE org_type = 'partner';

GRANT SELECT ON admin_booking_earnings_v1 TO authenticated, service_role;
GRANT SELECT ON admin_org_earnings_summary_v1 TO authenticated, service_role;
GRANT SELECT ON admin_platform_earnings_v1 TO authenticated, service_role;
GRANT SELECT ON partner_org_earnings_v1 TO authenticated, service_role;

COMMIT;
