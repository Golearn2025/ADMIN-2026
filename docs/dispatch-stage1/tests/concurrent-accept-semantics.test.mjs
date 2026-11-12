/**
 * Concurrent accept SEMANTICS test — no DB, no OneSignal.
 * Models LIVE buggy UPDATE vs FIXED atomic UPDATE.
 *
 * Run: node docs/dispatch-stage1/tests/concurrent-accept-semantics.test.mjs
 */
import assert from 'node:assert/strict';

function raceBuggy(leg) {
  // Two sessions both passed the EXISTS check, then both UPDATE by id only.
  const s1 = { ...leg };
  const s2 = { ...leg };
  // Session1 UPDATE WHERE id = X  (no assigned_driver_id IS NULL)
  s1.assigned = 'A';
  s1.status = 'ASSIGNED';
  // Session2 UPDATE WHERE id = X  — overwrites
  s2.assigned = 'B';
  s2.status = 'ASSIGNED';
  return { winner: s2.assigned, overwritten: true };
}

function raceFixed(leg) {
  // Atomic: UPDATE ... WHERE assigned_driver_id IS NULL returning rowcount
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
  // Truly "simultaneous": only first CAS wins
  const a = tryAccept('A');
  const b = tryAccept('B');
  return { winner: assigned, rows: [a, b], overwritten: false };
}

const leg = { status: 'PENDING', assigned: null };
const buggy = raceBuggy(leg);
assert.equal(buggy.overwritten, true);
assert.equal(buggy.winner, 'B');

const fixed = raceFixed({ status: 'PENDING', assigned: null });
assert.equal(fixed.winner, 'A');
assert.deepEqual(fixed.rows, [1, 0]);
assert.equal(fixed.overwritten, false);

console.log('concurrent-accept-semantics: PASS (buggy overwrite vs fixed CAS)');
