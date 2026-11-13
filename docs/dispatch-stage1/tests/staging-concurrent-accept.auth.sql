-- =============================================================================
-- STAGING ONLY — concurrent accept with DISTINCT authenticated identities
-- DO NOT run on VL NEW / production.
--
-- Why not service-role?
--   Stage1 driver_accept_job requires auth.uid(). Two service-role RPCs without
--   JWT sub both return "Authentication required" and prove NOTHING about races.
--
-- Setup (replace UUIDs):
--   :leg_id        PENDING booking_leg with CONFIRMED parent + succeeded payment
--   :auth_user_a   auth.users.id for driver A
--   :auth_user_b   auth.users.id for driver B
--   Drivers A/B must be approved, same org as leg, vehicle-eligible.
-- =============================================================================

-- Session A (terminal 1)
BEGIN;
SELECT set_config('request.jwt.claim.sub', :'auth_user_a', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
-- Hold the row lock briefly so session B contends:
SELECT id, status, assigned_driver_id
FROM public.booking_legs
WHERE id = :'leg_id'
FOR UPDATE;
-- Accept as A
SELECT public.driver_accept_job(:'leg_id'::uuid) AS accept_a;
-- Keep transaction open until B has attempted, then:
COMMIT;

-- Session B (terminal 2) — start while A still holds FOR UPDATE / before COMMIT
BEGIN;
SELECT set_config('request.jwt.claim.sub', :'auth_user_b', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
SELECT public.driver_accept_job(:'leg_id'::uuid) AS accept_b;
COMMIT;

-- Expectation after both commit:
--   exactly one success:true
--   other success:false error 'Job not available for acceptance' (or race lost)
-- Verify:
--   SELECT assigned_driver_id, status FROM booking_legs WHERE id = :'leg_id';
--   SELECT status FROM job_dispatch_runs WHERE booking_leg_id = :'leg_id' ORDER BY started_at DESC;

-- Negative control (proves service-role alone is insufficient):
--   SET ROLE service_role;  -- or use service key without sub claim
--   SELECT public.driver_accept_job(:'leg_id'::uuid);
--   → success:false, error: Authentication required
