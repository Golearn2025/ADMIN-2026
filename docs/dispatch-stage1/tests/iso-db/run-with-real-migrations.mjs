/**
 * Loads EXACT migrations 600/601/602 from files onto local isolated Postgres.
 * No rewritten Stage1 function bodies in the test harness.
 *
 * Requires: local PG on 127.0.0.1:55432 (iso-db/pgdata)
 * Run: node docs/dispatch-stage1/tests/iso-db/run-with-real-migrations.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../..');
const MIGRATIONS = path.join(ROOT, 'docs/dispatch-stage1/migrations');
const BOOTSTRAP = path.join(__dirname, 'bootstrap-schema.sql');
const PGHOST = process.env.ISO_PGHOST || '127.0.0.1';
const PGPORT = process.env.ISO_PGPORT || '55432';
const PGUSER = process.env.ISO_PGUSER || 'postgres';
const ISO_DB = 'dispatch_stage1_iso';

const results = { passed: [], failed: [], skipped: [], kind: 'real-migrations-local-pg' };

async function check(name, fn) {
  try {
    await fn();
    results.passed.push(name);
    console.log(`PASS  ${name}`);
  } catch (e) {
    results.failed.push({ name, error: String(e?.stack || e) });
    console.log(`FAIL  ${name}: ${e?.message || e}`);
  }
}
function skip(name, reason) {
  results.skipped.push({ name, reason });
  console.log(`SKIP  ${name} — ${reason}`);
}

function sqlFile(name) {
  return fs.readFileSync(path.join(MIGRATIONS, name), 'utf8');
}

async function adminClient() {
  return new pg.Client({ host: PGHOST, port: Number(PGPORT), user: PGUSER, database: ISO_DB });
}

async function execFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

async function asJwt(client, sub, role = 'authenticated') {
  await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [sub || '']);
  await client.query(`SELECT set_config('request.jwt.claim.role', $1, false)`, [role || '']);
}

async function main() {
  // Ensure DB exists
  const boot = new pg.Client({ host: PGHOST, port: Number(PGPORT), user: PGUSER, database: 'postgres' });
  await boot.connect();
  await boot.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [ISO_DB]).catch(() => {});
  await boot.query(`DROP DATABASE IF EXISTS ${ISO_DB}`);
  await boot.query(`CREATE DATABASE ${ISO_DB}`);
  await boot.end();

  const c = await adminClient();
  await c.connect();

  // Bootstrap + exact migrations
  await execFile(c, BOOTSTRAP);
  await c.query(sqlFile('20261112060000_dispatch_stage1_atomic_accept_and_wave_rules.sql'));
  await c.query(sqlFile('20261112060100_dispatch_stage1_payment_trigger_premium_first.sql'));
  await c.query(sqlFile('20261112060200_dispatch_stage1_offers_org_filter.sql'));

  // Prove functions came from migration (signature markers), not harness copies
  await check('Migration 600 loaded: driver_selected_vehicle_matches_leg + grants', async () => {
    const r = await c.query(`
      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
             has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
             has_function_privilege('service_role', p.oid, 'EXECUTE') AS sr_exec
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN (
        'driver_selected_vehicle_matches_leg','enqueue_dispatch_wave_notifications',
        'start_premium_dispatch_run','advance_expired_job_dispatch_waves','job_leg_is_offerable'
      )
      ORDER BY 1,2`);
    assert.ok(r.rows.some((x) => x.proname === 'job_leg_is_offerable'));
    const enqueue = r.rows.find((x) => x.proname === 'enqueue_dispatch_wave_notifications');
    assert.equal(enqueue.anon_exec, false);
    assert.equal(enqueue.auth_exec, false);
    assert.equal(enqueue.sr_exec, true);
    const src = await c.query(`SELECT pg_get_functiondef(oid) AS d FROM pg_proc
      WHERE proname='dispatch_caller_is_backend' AND pronamespace='public'::regnamespace`);
    assert.ok(src.rows[0].d.includes('session_user'));
    assert.ok(!src.rows[0].d.match(/current_user\s+IN/));
  });

  await check('Migration 602 view exists with can_receive_jobs join', async () => {
    const v = await c.query(`SELECT pg_get_viewdef('public.driver_job_offers_v2'::regclass, true) AS d`);
    assert.ok(v.rows[0].d.includes('can_receive_jobs'));
    assert.ok(v.rows[0].d.includes('organization_id = bl.organization_id'));
  });

  // Seed fictional org
  const ORG = '11111111-1111-1111-1111-111111111111';
  const ORG2 = '22222222-2222-2222-2222-222222222222';
  const AUTH_ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const AUTH_OP = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const AUTH_MEMBER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const AUTH_DA = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const AUTH_DB = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const AUTH_DP = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003';
  const AUTH_OTHER = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const DRIVER_A = 'a0000000-0000-0000-0000-000000000001';
  const DRIVER_B = 'a0000000-0000-0000-0000-000000000002';
  const DRIVER_P = 'a0000000-0000-0000-0000-000000000003';
  const VA = 'b0000000-0000-0000-0000-000000000001';
  const VB = 'b0000000-0000-0000-0000-000000000002';
  const VP = 'b0000000-0000-0000-0000-000000000003';
  const VA_BAD = 'b0000000-0000-0000-0000-000000000099';

  await c.query(`
    INSERT INTO organizations VALUES ('${ORG}','Iso'), ('${ORG2}','Other');
    INSERT INTO auth.users(id) VALUES
      ('${AUTH_ADMIN}'),('${AUTH_OP}'),('${AUTH_MEMBER}'),
      ('${AUTH_DA}'),('${AUTH_DB}'),('${AUTH_DP}'),('${AUTH_OTHER}');
    INSERT INTO organization_members VALUES
      ('${ORG}','${AUTH_ADMIN}','admin'),
      ('${ORG}','${AUTH_OP}','operator'),
      ('${ORG}','${AUTH_MEMBER}','member'),
      ('${ORG2}','${AUTH_OTHER}','admin');
    INSERT INTO drivers(id,auth_user_id,organization_id) VALUES
      ('${DRIVER_A}','${AUTH_DA}','${ORG}'),
      ('${DRIVER_B}','${AUTH_DB}','${ORG}'),
      ('${DRIVER_P}','${AUTH_DP}','${ORG}');
    INSERT INTO vehicles(id,driver_id,organization_id,model_id,category_id) VALUES
      ('${VA}','${DRIVER_A}','${ORG}','mercedes-e-class','executive'),
      ('${VA_BAD}','${DRIVER_A}','${ORG}','bmw-5','executive'),
      ('${VB}','${DRIVER_B}','${ORG}','mercedes-e-class','executive'),
      ('${VP}','${DRIVER_P}','${ORG}','mercedes-e-class','executive');
    INSERT INTO driver_app_vehicle VALUES
      ('${VA}','${DRIVER_A}','${ORG}',true),
      ('${VA_BAD}','${DRIVER_A}','${ORG}',false),
      ('${VB}','${DRIVER_B}','${ORG}',true),
      ('${VP}','${DRIVER_P}','${ORG}',true);
    INSERT INTO dispatch_org_settings(organization_id,premium_wait_minutes,waves_enabled_automatic)
    VALUES ('${ORG}',10,false);
    INSERT INTO dispatch_premium_drivers VALUES ('${ORG}','${DRIVER_P}');
  `);

  async function seedLeg({ wavesAuto = false, premium = true } = {}) {
    await c.query(`DELETE FROM notification_events`);
    await c.query(`DELETE FROM job_dispatch_runs`);
    await c.query(`DELETE FROM booking_payments`);
    await c.query(`DELETE FROM booking_legs`);
    await c.query(`DELETE FROM bookings`);
    await c.query(`UPDATE dispatch_org_settings SET waves_enabled_automatic=$1 WHERE organization_id=$2`, [
      wavesAuto,
      ORG,
    ]);
    if (premium) {
      await c.query(
        `INSERT INTO dispatch_premium_drivers VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [ORG, DRIVER_P]
      );
    } else {
      await c.query(`DELETE FROM dispatch_premium_drivers WHERE organization_id=$1`, [ORG]);
    }
    const book = 'c0000000-0000-0000-0000-000000000001';
    const leg = 'd0000000-0000-0000-0000-000000000001';
    await c.query(
      `INSERT INTO bookings(id,organization_id,reference,status,booking_type)
       VALUES ($1,$2,'ISO-1','CONFIRMED','transfer')`,
      [book, ORG]
    );
    await c.query(
      `INSERT INTO booking_payments(booking_id,organization_id,status) VALUES ($1,$2,'succeeded')`,
      [book, ORG]
    );
    await c.query(
      `INSERT INTO booking_legs(id,booking_id,organization_id,status,vehicle_category_id,vehicle_model_id,scheduled_at)
       VALUES ($1,$2,$3,'PENDING','executive','mercedes-e-class', now()+interval '3 hours')`,
      [leg, book, ORG]
    );
    return { book, leg };
  }

  // Attach payment trigger from migration 601 function
  await c.query(`
    DROP TRIGGER IF EXISTS trg_enqueue_driver_job_available_on_payment ON booking_payments;
    CREATE TRIGGER trg_enqueue_driver_job_available_on_payment
      AFTER INSERT OR UPDATE OF status ON booking_payments
      FOR EACH ROW EXECUTE FUNCTION enqueue_driver_job_available_on_payment_succeeded();
  `);

  await check('Auth deny: driver / member / other-org on start_premium (loaded fn)', async () => {
    const { leg } = await seedLeg();
    await asJwt(c, AUTH_DA);
    let r = await c.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [leg]);
    assert.equal(r.rows[0].j.success, false);
    await asJwt(c, AUTH_MEMBER);
    r = await c.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [leg]);
    assert.equal(r.rows[0].j.success, false);
    await asJwt(c, AUTH_OTHER);
    r = await c.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [leg]);
    assert.equal(r.rows[0].j.success, false);
  });

  await check('Regression: waves OFF = general (no auto Premium on payment)', async () => {
    const { book, leg } = await seedLeg({ wavesAuto: false });
    await asJwt(c, '', 'service_role');
    // payment already succeeded at seed — simulate new payment insert on another book
    await c.query(`DELETE FROM booking_payments WHERE booking_id=$1`, [book]);
    await c.query(
      `INSERT INTO booking_payments(booking_id,organization_id,status) VALUES ($1,$2,'succeeded')`,
      [book, ORG]
    );
    const runs = await c.query(`SELECT wave FROM job_dispatch_runs WHERE booking_leg_id=$1`, [leg]);
    assert.equal(runs.rows.length, 0); // no auto premium run when waves OFF
    const ev = await c.query(
      `SELECT driver_id, payload->>'dispatch_wave' AS w FROM notification_events WHERE job_id=$1`,
      [leg]
    );
    // legacy fallback open broadcast (driver_id null) from payment trigger path C
    assert.ok(ev.rows.length >= 1);
    assert.equal(ev.rows[0].driver_id, null);
  });

  await check('Regression: waves ON = Premium then Open via advance', async () => {
    const { leg } = await seedLeg({ wavesAuto: true });
    await asJwt(c, '', 'service_role');
    // re-fire by updating payment status bounce
    await c.query(
      `UPDATE booking_payments SET status='pending' WHERE booking_id=(SELECT booking_id FROM booking_legs WHERE id=$1)`,
      [leg]
    );
    await c.query(
      `UPDATE booking_payments SET status='succeeded' WHERE booking_id=(SELECT booking_id FROM booking_legs WHERE id=$1)`,
      [leg]
    );
    let run = await c.query(
      `SELECT wave, status FROM job_dispatch_runs WHERE booking_leg_id=$1 AND status='active'`,
      [leg]
    );
    assert.equal(run.rows[0].wave, 'premium');
    const prem = await c.query(
      `SELECT driver_id FROM notification_events WHERE job_id=$1 AND source_module='dispatch_wave_premium'`,
      [leg]
    );
    assert.deepEqual(prem.rows.map((x) => x.driver_id), [DRIVER_P]);
    await c.query(
      `UPDATE job_dispatch_runs SET expires_at=now()-interval '1 minute' WHERE booking_leg_id=$1 AND wave='premium'`,
      [leg]
    );
    const adv = await c.query(`SELECT advance_expired_job_dispatch_waves() AS j`);
    assert.equal(adv.rows[0].j.success, true);
    run = await c.query(
      `SELECT wave FROM job_dispatch_runs WHERE booking_leg_id=$1 AND status='active'`,
      [leg]
    );
    assert.equal(run.rows[0].wave, 'open');
  });

  await check('Regression: Admin Open = open immediately via start_premium empty/A or enqueue open', async () => {
    const { leg } = await seedLeg({ wavesAuto: false, premium: false });
    await asJwt(c, '', 'service_role');
    const r = await c.query(`SELECT start_premium_dispatch_run($1::uuid) AS j`, [leg]);
    assert.equal(r.rows[0].j.success, true);
    assert.equal(r.rows[0].j.wave, 'open'); // Option A independent of website waves flag
  });

  await check('Regression: Admin Direct exclusive — only exclusive driver', async () => {
    const { book, leg } = await seedLeg({ wavesAuto: false });
    await asJwt(c, '', 'service_role');
    await c.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status)
       VALUES ($1,$2,$3,'direct','direct',$4,'active')`,
      [ORG, book, leg, DRIVER_A]
    );
    await asJwt(c, AUTH_DB);
    let a = await c.query(`SELECT driver_accept_job($1::uuid) AS j`, [leg]);
    assert.equal(a.rows[0].j.success, false);
    await asJwt(c, AUTH_DA);
    a = await c.query(`SELECT driver_accept_job($1::uuid) AS j`, [leg]);
    assert.equal(a.rows[0].j.success, true);
  });

  await check('Driver card (offers view) + Accept align on can_receive_jobs', async () => {
    const { leg } = await seedLeg();
    await asJwt(c, '', 'service_role');
    await c.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,status)
       SELECT organization_id, booking_id, id, 'waves', 'open', 'active' FROM booking_legs WHERE id=$1`,
      [leg]
    );
    await asJwt(c, AUTH_DA);
    const offers = await c.query(`SELECT job_id FROM driver_job_offers_v2`);
    assert.ok(offers.rows.some((r) => r.job_id === leg));
    // vehicle with can_receive_jobs=false must not satisfy selected accept
    const bad = await c.query(`SELECT driver_accept_job($1::uuid,$2::uuid,$3::uuid) AS ok`, [
      DRIVER_A,
      VA_BAD,
      leg,
    ]);
    assert.equal(bad.rows[0].ok, false);
    const good = await c.query(`SELECT driver_accept_job($1::uuid,$2::uuid,$3::uuid) AS ok`, [
      DRIVER_A,
      VA,
      leg,
    ]);
    assert.equal(good.rows[0].ok, true);
  });

  await check('Direct exclusivity missing on wave=direct → zero notify (migration 601)', async () => {
    const { book, leg } = await seedLeg({ wavesAuto: true });
    await asJwt(c, '', 'service_role');
    await c.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,exclusive_driver_id,status)
       VALUES ($1,$2,$3,'direct','direct',NULL,'active')`,
      [ORG, book, leg]
    );
    await c.query(`DELETE FROM notification_events`);
    await c.query(
      `UPDATE booking_payments SET status='pending' WHERE booking_id=$1`,
      [book]
    );
    await c.query(
      `UPDATE booking_payments SET status='succeeded' WHERE booking_id=$1`,
      [book]
    );
    const n = await c.query(`SELECT count(*)::int AS c FROM notification_events WHERE job_id=$1`, [leg]);
    assert.equal(n.rows[0].c, 0);
  });

  await c.end();

  // ---- Two independent connections concurrency ----
  await check('Two PG connections + two auth identities → one accept winner', async () => {
    const setup = await adminClient();
    await setup.connect();
    await asJwt(setup, '', 'service_role');
    await setup.query(`DELETE FROM notification_events; DELETE FROM job_dispatch_runs; DELETE FROM booking_payments; DELETE FROM booking_legs; DELETE FROM bookings;`);
    const book = 'c0000000-0000-0000-0000-000000000099';
    const leg = 'd0000000-0000-0000-0000-000000000099';
    await setup.query(
      `INSERT INTO bookings(id,organization_id,reference,status,booking_type) VALUES ($1,$2,'RACE','CONFIRMED','transfer')`,
      [book, ORG]
    );
    await setup.query(
      `INSERT INTO booking_payments(booking_id,organization_id,status) VALUES ($1,$2,'succeeded')`,
      [book, ORG]
    );
    await setup.query(
      `INSERT INTO booking_legs(id,booking_id,organization_id,status,vehicle_category_id,vehicle_model_id,scheduled_at)
       VALUES ($1,$2,$3,'PENDING','executive','mercedes-e-class', now()+interval '2 hours')`,
      [leg, book, ORG]
    );
    await setup.query(
      `INSERT INTO job_dispatch_runs(organization_id,booking_id,booking_leg_id,mode,wave,status)
       VALUES ($1,$2,$3,'waves','open','active')`,
      [ORG, book, leg]
    );
    await setup.end();

    const c1 = new pg.Client({ host: PGHOST, port: Number(PGPORT), user: PGUSER, database: ISO_DB });
    const c2 = new pg.Client({ host: PGHOST, port: Number(PGPORT), user: PGUSER, database: ISO_DB });
    await c1.connect();
    await c2.connect();
    await asJwt(c1, AUTH_DA);
    await asJwt(c2, AUTH_DB);

    const [r1, r2] = await Promise.all([
      c1.query(`SELECT driver_accept_job($1::uuid) AS j`, [leg]),
      c2.query(`SELECT driver_accept_job($1::uuid) AS j`, [leg]),
    ]);
    const outcomes = [r1.rows[0].j.success, r2.rows[0].j.success];
    assert.equal(outcomes.filter(Boolean).length, 1);
    assert.equal(outcomes.filter((x) => !x).length, 1);

    const verify = await adminClient();
    await verify.connect();
    const legRow = await verify.query(`SELECT assigned_driver_id, status::text FROM booking_legs WHERE id=$1`, [leg]);
    assert.ok([DRIVER_A, DRIVER_B].includes(legRow.rows[0].assigned_driver_id));
    assert.equal(legRow.rows[0].status, 'ASSIGNED');
    await verify.end();
    await c1.end();
    await c2.end();
  });

  console.log('\n=== SUMMARY (real migrations) ===');
  console.log(
    `passed=${results.passed.length} failed=${results.failed.length} skipped=${results.skipped.length}`
  );
  fs.writeFileSync(path.join(__dirname, 'LAST_RUN_REAL_MIGRATIONS.json'), JSON.stringify(results, null, 2));
  if (results.failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
