/**
 * Concurrent accept SEMANTICS test — no DB, no OneSignal.
 * Models LIVE buggy UPDATE vs FIXED atomic UPDATE.
 * Also documents why service-role-without-auth cannot stand in for two drivers.
 *
 * Run: node docs/dispatch-stage1/tests/concurrent-accept-semantics.test.mjs
 */
import assert from 'node:assert/strict';

function raceBuggy(leg) {
  const s1 = { ...leg };
  const s2 = { ...leg };
  s1.assigned = 'A';
  s1.status = 'ASSIGNED';
  s2.assigned = 'B';
  s2.status = 'ASSIGNED';
  return { winner: s2.assigned, overwritten: true };
}

function raceFixed(leg) {
  let assigned = leg.assigned;
  let status = leg.status;
  function tryAccept(driver) {
    if (status === 'PENDING' && assigned == null) {
      assigned = driver;
      status = 'ASSIGNED';
      return 1;
    }
    return 0;
  }
  const a = tryAccept('A');
  const b = tryAccept('B');
  return { winner: assigned, rows: [a, b], overwritten: false };
}

function acceptWithAuth({ authUid, driverAuthUid }) {
  if (!authUid) return { ok: false, error: 'Authentication required' };
  if (authUid !== driverAuthUid) return { ok: false, error: 'Cannot accept as another driver' };
  return { ok: true };
}

const leg = { status: 'PENDING', assigned: null };
const buggy = raceBuggy(leg);
assert.equal(buggy.overwritten, true);
assert.equal(buggy.winner, 'B');

const fixed = raceFixed({ status: 'PENDING', assigned: null });
assert.equal(fixed.winner, 'A');
assert.deepEqual(fixed.rows, [1, 0]);
assert.equal(fixed.overwritten, false);

// Two service-role calls without auth.uid() — both rejected; not a concurrency proof
const s1 = acceptWithAuth({ authUid: null, driverAuthUid: 'A' });
const s2 = acceptWithAuth({ authUid: null, driverAuthUid: 'B' });
assert.equal(s1.ok, false);
assert.equal(s2.ok, false);
assert.equal(s1.error, 'Authentication required');

// Distinct authenticated identities
assert.equal(acceptWithAuth({ authUid: 'A', driverAuthUid: 'A' }).ok, true);
assert.equal(acceptWithAuth({ authUid: 'A', driverAuthUid: 'B' }).ok, false);

console.log(
  'concurrent-accept-semantics: PASS (atomic CAS + auth.uid required; service-role-alone rejected)'
);
