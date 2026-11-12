/**
 * Isolated Stage-1 dispatch simulator — NO Supabase, NO OneSignal, NO network.
 *
 * Run: node docs/dispatch-stage1/tests/dispatch-stage1.isolated.test.mjs
 *
 * Models the intended rules:
 * - Direct → only selected driver; never auto-cascade
 * - Premium → after premiumWaitMinutes → Open (non-premium notified; premium no 2nd push)
 * - Accept / cancel stops further waves
 * - Vehicle + org eligibility
 * - Duplicate idempotency keys drop second notify
 * - Concurrent accept → one winner
 */

import assert from 'node:assert/strict';

const ORG = 'org-vl';
const PREMIUM_WAIT_MS = 10 * 60 * 1000;

function createWorld(clock = { now: 0 }) {
  const state = {
    clock,
    premium: new Set(),
    drivers: new Map(), // id -> { org, vehicles:[{category,model}] }
    runs: new Map(), // legId -> run
    notifications: [], // { legId, wave, driverId, key }
    legs: new Map(), // legId -> { org, category, model, status, assigned }
  };

  function vehicleOk(driverId, leg) {
    const d = state.drivers.get(driverId);
    if (!d || d.org !== leg.org) return false;
    return d.vehicles.some((v) =>
      leg.model ? v.model === leg.model : v.category === leg.category
    );
  }

  function waveAllows(legId, driverId) {
    const run = state.runs.get(legId);
    if (!run || run.status !== 'active') return true;
    if (run.wave === 'open') return true;
    if (run.wave === 'direct') return run.exclusiveDriverId === driverId;
    if (run.wave === 'premium') return state.premium.has(driverId);
    return true;
  }

  function enqueue(legId, wave, driverId) {
    const key = `wave:${wave}:${legId}:${driverId}`;
    if (state.notifications.some((n) => n.key === key)) return false;
    state.notifications.push({ legId, wave, driverId, key, at: state.clock.now });
    return true;
  }

  function startDirect(legId, driverId) {
    const leg = state.legs.get(legId);
    if (!driverId) throw new Error('exclusiveDriverId required');
    if (!state.drivers.has(driverId)) throw new Error('Driver not found');
    if (!vehicleOk(driverId, leg)) throw new Error('Driver vehicle not eligible');
    state.runs.set(legId, {
      wave: 'direct',
      status: 'active',
      exclusiveDriverId: driverId,
      expiresAt: null, // Direct does not auto-advance
    });
    enqueue(legId, 'direct', driverId);
  }

  function startPremium(legId) {
    const leg = state.legs.get(legId);
    const run = state.runs.get(legId);
    if (run?.wave === 'direct' && run.status === 'active') {
      throw new Error('Direct active — refuse Premium cascade');
    }
    const targets = [...state.premium].filter((id) => vehicleOk(id, leg));
    state.runs.set(legId, {
      wave: 'premium',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: state.clock.now + PREMIUM_WAIT_MS,
    });
    for (const id of targets) enqueue(legId, 'premium', id);
    if (targets.length === 0) startOpen(legId);
  }

  function startOpen(legId) {
    const leg = state.legs.get(legId);
    const prev = state.runs.get(legId);
    if (prev) prev.status = 'expired';
    state.runs.set(legId, {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    for (const [id] of state.drivers) {
      if (!vehicleOk(id, leg)) continue;
      if (state.premium.has(id)) continue; // no second notify
      enqueue(legId, 'open', id);
    }
  }

  function advanceExpired() {
    for (const [legId, run] of state.runs) {
      const leg = state.legs.get(legId);
      if (run.status !== 'active' || run.wave !== 'premium') continue;
      if (leg.status !== 'PENDING' || leg.assigned) continue;
      if (run.expiresAt != null && state.clock.now >= run.expiresAt) {
        startOpen(legId);
      }
    }
  }

  function accept(legId, driverId) {
    const leg = state.legs.get(legId);
    if (leg.status !== 'PENDING' || leg.assigned) return { ok: false, error: 'taken' };
    if (!waveAllows(legId, driverId)) return { ok: false, error: 'reserved' };
    if (!vehicleOk(driverId, leg)) return { ok: false, error: 'vehicle' };
    // atomic compare-and-set
    if (leg.assigned) return { ok: false, error: 'taken' };
    leg.assigned = driverId;
    leg.status = 'ASSIGNED';
    const run = state.runs.get(legId);
    if (run) {
      run.status = 'accepted';
    }
    return { ok: true };
  }

  function cancel(legId) {
    const leg = state.legs.get(legId);
    leg.status = 'CANCELLED';
    const run = state.runs.get(legId);
    if (run && run.status === 'active') run.status = 'cancelled';
  }

  function visibleTo(legId, driverId) {
    const leg = state.legs.get(legId);
    if (leg.status !== 'PENDING' || leg.assigned) return false;
    if (!vehicleOk(driverId, leg)) return false;
    return waveAllows(legId, driverId);
  }

  return {
    state,
    addDriver(id, org, vehicles) {
      state.drivers.set(id, { org, vehicles });
    },
    addPremium(id) {
      state.premium.add(id);
    },
    addLeg(id, { org = ORG, category, model = null } = {}) {
      state.legs.set(id, { org, category, model, status: 'PENDING', assigned: null });
    },
    startDirect,
    startPremium,
    advanceExpired,
    accept,
    cancel,
    visibleTo,
    tick(ms) {
      state.clock.now += ms;
      advanceExpired();
    },
    notifies(legId) {
      return state.notifications.filter((n) => n.legId === legId);
    },
  };
}

function run() {
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  };

  check('Direct → only B eligible + notified', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addDriver('B', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addLeg('L1', { category: 'executive', model: 'mercedes-e-class' });
    w.startDirect('L1', 'B');
    assert.equal(w.visibleTo('L1', 'B'), true);
    assert.equal(w.visibleTo('L1', 'A'), false);
    assert.deepEqual(
      w.notifies('L1').map((n) => n.driverId),
      ['B']
    );
  });

  check('Direct without driver → error, no fan-out', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: null }]);
    w.addLeg('L1', { category: 'executive', model: null });
    assert.throws(() => w.startDirect('L1', ''), /exclusiveDriverId/);
    assert.equal(w.notifies('L1').length, 0);
  });

  check('Premium: only premium+vehicle notified', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addDriver('P2', ORG, [{ category: 'luxury', model: 'mercedes-s-class' }]);
    w.addDriver('N1', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addPremium('P1');
    w.addPremium('P2');
    w.addLeg('L1', { category: 'executive', model: 'mercedes-e-class' });
    w.startPremium('L1');
    assert.deepEqual(
      w.notifies('L1').map((n) => n.driverId),
      ['P1']
    );
    assert.equal(w.visibleTo('L1', 'P1'), true);
    assert.equal(w.visibleTo('L1', 'N1'), false);
  });

  check('After 10 minutes: open to others; Premium no 2nd notify', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addPremium('P1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1');
    w.tick(PREMIUM_WAIT_MS);
    const waves = w.notifies('L1').map((n) => `${n.wave}:${n.driverId}`);
    assert.ok(waves.includes('premium:P1'));
    assert.ok(waves.includes('open:N1'));
    assert.ok(!waves.includes('open:P1'));
    assert.equal(w.visibleTo('L1', 'P1'), true); // still visible
    assert.equal(w.visibleTo('L1', 'N1'), true);
  });

  check('Accept before expiry → no open wave', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addPremium('P1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1');
    assert.equal(w.accept('L1', 'P1').ok, true);
    w.tick(PREMIUM_WAIT_MS);
    assert.ok(!w.notifies('L1').some((n) => n.wave === 'open'));
  });

  check('Cancel → no further notifications', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addPremium('P1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1');
    w.cancel('L1');
    w.tick(PREMIUM_WAIT_MS);
    assert.ok(!w.notifies('L1').some((n) => n.wave === 'open'));
  });

  check('Idempotent re-enqueue drops duplicates', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: null }]);
    w.addPremium('P1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1');
    w.startPremium('L1');
    assert.equal(w.notifies('L1').filter((n) => n.driverId === 'P1').length, 1);
  });

  check('Concurrent accept → one winner', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('B', ORG, [{ category: 'executive', model: null }]);
    w.addLeg('L1', { category: 'executive', model: null });
    w.state.runs.set('L1', { wave: 'open', status: 'active', exclusiveDriverId: null, expiresAt: null });
    const r1 = w.accept('L1', 'A');
    const r2 = w.accept('L1', 'B');
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, false);
    assert.equal(w.state.legs.get('L1').assigned, 'A');
  });

  check('Wrong org / vehicle → no access', () => {
    const w = createWorld();
    w.addDriver('X', 'other-org', [{ category: 'executive', model: null }]);
    w.addDriver('Y', ORG, [{ category: 'luxury', model: null }]);
    w.addLeg('L1', { category: 'executive', model: null });
    w.state.runs.set('L1', { wave: 'open', status: 'active', exclusiveDriverId: null, expiresAt: null });
    assert.equal(w.visibleTo('L1', 'X'), false);
    assert.equal(w.visibleTo('L1', 'Y'), false);
  });

  check('Direct never auto-cascades after timer', () => {
    const w = createWorld();
    w.addDriver('B', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addPremium('N1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startDirect('L1', 'B');
    w.tick(PREMIUM_WAIT_MS * 3);
    assert.equal(w.state.runs.get('L1').wave, 'direct');
    assert.equal(w.visibleTo('L1', 'N1'), false);
    assert.ok(!w.notifies('L1').some((n) => n.wave !== 'direct'));
  });

  check('Any-model category match', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: 'bmw-5' }]);
    w.addDriver('B', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addLeg('L1', { category: 'executive', model: null });
    w.state.runs.set('L1', { wave: 'open', status: 'active', exclusiveDriverId: null, expiresAt: null });
    assert.equal(w.visibleTo('L1', 'A'), true);
    assert.equal(w.visibleTo('L1', 'B'), true);
  });

  check('Exact model match required when model set', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: 'bmw-5' }]);
    w.addDriver('B', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addLeg('L1', { category: 'executive', model: 'mercedes-e-class' });
    w.state.runs.set('L1', { wave: 'open', status: 'active', exclusiveDriverId: null, expiresAt: null });
    assert.equal(w.visibleTo('L1', 'A'), false);
    assert.equal(w.visibleTo('L1', 'B'), true);
  });

  console.log(`\n${passed} isolated tests passed (no production contact).`);
}

run();
