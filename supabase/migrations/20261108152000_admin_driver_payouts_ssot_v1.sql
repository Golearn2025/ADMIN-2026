-- Driver weekly payouts SSOT (jobs + weekly rollup + mark-paid ledger)
-- Applied remotely as admin_driver_payouts_ssot_v1.
-- Views are the read source of truth; marks table tracks payout lifecycle for Wise.

CREATE TABLE IF NOT EXISTS public.driver_payout_line_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  booking_leg_id uuid NOT NULL UNIQUE REFERENCES public.booking_legs(id),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'ready', 'exported', 'paid', 'skipped')),
  paid_at timestamptz,
  paid_by_auth_user_id uuid,
  payment_reference text,
  export_batch_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_payout_line_marks_org_status
  ON public.driver_payout_line_marks (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_payout_line_marks_driver
  ON public.driver_payout_line_marks (driver_id, status);

ALTER TABLE public.driver_payout_line_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driver_payout_line_marks_service ON public.driver_payout_line_marks;
CREATE POLICY driver_payout_line_marks_service
  ON public.driver_payout_line_marks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.driver_payout_line_marks TO authenticated;
GRANT ALL ON public.driver_payout_line_marks TO service_role;

CREATE OR REPLACE VIEW public.admin_driver_payout_jobs_v1 AS
WITH paid AS (
  SELECT
    bp.booking_id,
    SUM(bp.amount_pence) FILTER (
      WHERE bp.status = 'succeeded' AND bp.deleted_at IS NULL
    )::bigint AS client_paid_pence,
    MAX(bp.invoice_paid_at) FILTER (WHERE bp.status = 'succeeded') AS client_last_paid_at,
    BOOL_OR(bp.status = 'succeeded' AND bp.deleted_at IS NULL) AS client_has_succeeded_payment
  FROM public.booking_payments bp
  GROUP BY bp.booking_id
),
fin AS (
  SELECT DISTINCT ON (ilf.booking_leg_id)
    ilf.booking_leg_id,
    COALESCE(
      ilf.driver_final_payout_pence,
      ilf.driver_estimated_payout_pence,
      ilf.driver_payout_pence,
      ilf.driver_target_payout_pence,
      0
    )::bigint AS driver_owed_pence,
    ilf.currency AS payout_currency,
    ilf.version AS financials_version
  FROM public.internal_leg_financials ilf
  ORDER BY ilf.booking_leg_id, ilf.version DESC NULLS LAST, ilf.created_at DESC NULLS LAST
),
bank AS (
  SELECT DISTINCT ON (dbd.driver_id)
    dbd.driver_id,
    dbd.account_holder_name,
    dbd.bank_name,
    dbd.account_number,
    dbd.sort_code,
    dbd.iban,
    dbd.is_verified AS bank_verified,
    (
      NULLIF(TRIM(COALESCE(dbd.account_number, '')), '') IS NOT NULL
      AND NULLIF(TRIM(COALESCE(dbd.sort_code, '')), '') IS NOT NULL
    ) AS has_uk_bank_details
  FROM public.driver_bank_details dbd
  WHERE dbd.deleted_at IS NULL
  ORDER BY dbd.driver_id, dbd.updated_at DESC NULLS LAST, dbd.created_at DESC NULLS LAST
)
SELECT
  b.organization_id,
  b.id AS booking_id,
  bl.id AS booking_leg_id,
  bl.leg_number,
  b.reference AS booking_reference,
  b.status AS booking_status,
  bl.status AS leg_status,
  bl.assigned_driver_id AS driver_id,
  TRIM(CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, ''))) AS driver_name,
  d.phone AS driver_phone,
  d.email AS driver_email,
  COALESCE(bl.completed_at, bl.scheduled_at) AS settlement_at,
  (timezone('Europe/London', COALESCE(bl.completed_at, bl.scheduled_at)))::date AS settlement_date_london,
  to_char(
    timezone('Europe/London', COALESCE(bl.completed_at, bl.scheduled_at)),
    'IYYY-"W"IW'
  ) AS week_key,
  date_trunc(
    'week',
    timezone('Europe/London', COALESCE(bl.completed_at, bl.scheduled_at))
  )::date AS week_start_london,
  (
    date_trunc(
      'week',
      timezone('Europe/London', COALESCE(bl.completed_at, bl.scheduled_at))
    ) + interval '6 days'
  )::date AS week_end_london,
  COALESCE(p.client_paid_pence, 0)::bigint AS client_paid_pence,
  COALESCE(p.client_has_succeeded_payment, false) AS client_paid,
  p.client_last_paid_at,
  COALESCE(f.driver_owed_pence, 0)::bigint AS driver_owed_pence,
  COALESCE(f.payout_currency, b.currency, 'GBP') AS currency,
  f.financials_version,
  COALESCE(bank.has_uk_bank_details, false) AS has_uk_bank_details,
  COALESCE(bank.bank_verified, false) AS bank_verified,
  bank.account_holder_name,
  bank.bank_name,
  CASE
    WHEN bank.account_number IS NULL OR length(TRIM(bank.account_number)) < 4 THEN NULL
    ELSE '****' || RIGHT(TRIM(bank.account_number), 4)
  END AS account_number_last4,
  CASE
    WHEN bank.sort_code IS NULL THEN NULL
    ELSE LEFT(regexp_replace(bank.sort_code, '[^0-9]', '', 'g'), 2) || '-**-**'
  END AS sort_code_masked,
  bank.account_number AS wise_account_number,
  regexp_replace(COALESCE(bank.sort_code, ''), '[^0-9]', '', 'g') AS wise_sort_code,
  bank.iban AS wise_iban,
  COALESCE(m.status, 'unpaid') AS payout_status,
  m.paid_at AS payout_paid_at,
  m.payment_reference AS payout_payment_reference,
  m.export_batch_id AS payout_export_batch_id,
  m.notes AS payout_notes,
  m.id AS payout_mark_id,
  bl.created_at,
  bl.updated_at
FROM public.booking_legs bl
JOIN public.bookings b ON b.id = bl.booking_id
JOIN public.drivers d ON d.id = bl.assigned_driver_id
LEFT JOIN paid p ON p.booking_id = b.id
LEFT JOIN fin f ON f.booking_leg_id = bl.id
LEFT JOIN bank ON bank.driver_id = bl.assigned_driver_id
LEFT JOIN public.driver_payout_line_marks m ON m.booking_leg_id = bl.id
WHERE bl.assigned_driver_id IS NOT NULL
  AND bl.status = 'COMPLETED';

CREATE OR REPLACE VIEW public.admin_driver_payout_weekly_v1 AS
SELECT
  organization_id,
  driver_id,
  driver_name,
  driver_email,
  driver_phone,
  week_key,
  week_start_london,
  week_end_london,
  currency,
  COUNT(*)::integer AS jobs_count,
  COUNT(*) FILTER (WHERE client_paid)::integer AS jobs_client_paid_count,
  SUM(client_paid_pence)::bigint AS client_paid_pence,
  SUM(driver_owed_pence)::bigint AS driver_owed_pence,
  COUNT(*) FILTER (WHERE payout_status IN ('paid'))::integer AS jobs_paid_count,
  COUNT(*) FILTER (WHERE payout_status IN ('exported'))::integer AS jobs_exported_count,
  COUNT(*) FILTER (WHERE payout_status IN ('unpaid', 'ready'))::integer AS jobs_unpaid_count,
  BOOL_OR(has_uk_bank_details) AS has_uk_bank_details,
  BOOL_AND(has_uk_bank_details) AS all_jobs_have_bank,
  MAX(account_holder_name) AS account_holder_name,
  MAX(bank_name) AS bank_name,
  MAX(account_number_last4) AS account_number_last4,
  MAX(sort_code_masked) AS sort_code_masked,
  CASE
    WHEN COUNT(*) FILTER (WHERE payout_status = 'paid') = COUNT(*) THEN 'paid'
    WHEN COUNT(*) FILTER (WHERE payout_status = 'exported') > 0
      AND COUNT(*) FILTER (WHERE payout_status IN ('unpaid', 'ready')) = 0
      AND COUNT(*) FILTER (WHERE payout_status = 'paid') < COUNT(*) THEN 'exported'
    WHEN COUNT(*) FILTER (WHERE payout_status = 'paid') > 0 THEN 'partial'
    ELSE 'unpaid'
  END AS week_payout_status
FROM public.admin_driver_payout_jobs_v1
GROUP BY
  organization_id,
  driver_id,
  driver_name,
  driver_email,
  driver_phone,
  week_key,
  week_start_london,
  week_end_london,
  currency;

GRANT SELECT ON public.admin_driver_payout_jobs_v1 TO authenticated, service_role;
GRANT SELECT ON public.admin_driver_payout_weekly_v1 TO authenticated, service_role;
