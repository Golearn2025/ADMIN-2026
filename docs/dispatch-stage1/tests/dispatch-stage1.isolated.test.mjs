/**
 * Isolated Stage-1 dispatch simulator — NO Supabase, NO OneSignal, NO network.
 *
 * Run: node docs/dispatch-stage1/tests/dispatch-stage1.isolated.test.mjs
 *
 * Models the intended rules:
 * - Direct → only selected driver; never auto-cascade
 * - Premium → after premiumWaitMinutes → Open
 * - Empty Premium → Open immediately (Option A); always an active run
 * - Open notifies previously-unnotified eligible drivers (incl. Premium added mid-wave)
 * - Accept requires vehicle (+ exact selected vehicle) and ready booking parent
 * - Concurrent accept → one winner
 */

import assert from 'node:assert/strict';

const ORG = 'org-vl';
const PREMIUM_WAIT_MS = 10 * 60 * 1000;

function createWorld(clock = { now: 0 }) {
  const state = {
    clock,
    premium: new Set(),
    drivers: new Map(), // id -> { org, authUserId, vehicles:[{id,category,model,canReceive}] }
    bookings: new Map(), // bookingId -> { deleted, status, paymentSucceeded }
    runs: new Map(), // legId -> run
    notifications: [], // { legId, wave, driverId, key, status }
    legs: new Map(), // legId -> { org, bookingId, category, model, status, assigned, assignedVehicle }
  };

  function vehicleOk(driverId, leg) {
    const d = state.drivers.get(driverId);
    if (!d || d.org !== leg.org) return false;
    return d.vehicles.some(
      (v) =>
        v.canReceive !== false &&
        (leg.model ? v.model === leg.model : v.category === leg.category)
    );
  }

  function selectedVehicleOk(driverId, vehicleId, leg) {
    const d = state.drivers.get(driverId);
    if (!d || d.org !== leg.org) return false;
    const v = d.vehicles.find((x) => x.id === vehicleId);
    if (!v || v.canReceive === false) return false;
    if (leg.model) return v.model === leg.model;
    return v.category === leg.category;
  }

  function bookingReady(leg) {
    const b = state.bookings.get(leg.bookingId);
    if (!b || b.deleted) return false;
    if (b.status !== 'CONFIRMED') return false;
    return b.paymentSucceeded === true;
  }

  function waveAllows(legId, driverId) {
    const run = state.runs.get(legId);
    if (!run || run.status !== 'active') return true;
    if (run.wave === 'open') return true;
    if (run.wave === 'direct') return run.exclusiveDriverId === driverId;
    if (run.wave === 'premium') return state.premium.has(driverId);
    return true;
  }

  function alreadyNotified(legId, driverId) {
    return state.notifications.some(
      (n) => n.legId === legId && n.driverId === driverId && n.status !== 'cancelled'
    );
  }

  function enqueue(legId, wave, driverId) {
    const key = `wave:${wave}:${legId}:${driverId}`;
    if (state.notifications.some((n) => n.key === key)) return false;
    state.notifications.push({
      legId,
      wave,
      driverId,
      key,
      at: state.clock.now,
      status: 'pending', // event created
      delivery: null, // null | provider_accepted | failed_retryable
    });
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
      expiresAt: null,
    });
    enqueue(legId, 'direct', driverId);
  }

  function startOpen(legId) {
    const leg = state.legs.get(legId);
    const prev = state.runs.get(legId);
    if (prev && prev.status === 'active') prev.status = 'expired';
    state.runs.set(legId, {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    for (const [id] of state.drivers) {
      if (!vehicleOk(id, leg)) continue;
      // Skip only previously notified — Premium added mid-wave still gets Open
      if (alreadyNotified(legId, id)) continue;
      enqueue(legId, 'open', id);
    }
  }

  function startPremium(legId) {
    const leg = state.legs.get(legId);
    const run = state.runs.get(legId);
    if (run?.wave === 'direct' && run.status === 'active') {
      throw new Error('Direct active — refuse Premium cascade');
    }
    const targets = [...state.premium].filter((id) => vehicleOk(id, leg));
    if (targets.length === 0) {
      // Option A
      startOpen(legId);
      return { wave: 'open', reason: 'no_eligible_premium_open_immediately' };
    }
    state.runs.set(legId, {
      wave: 'premium',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: state.clock.now + PREMIUM_WAIT_MS,
    });
    for (const id of targets) enqueue(legId, 'premium', id);
    return { wave: 'premium' };
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

  function accept(legId, driverId, { vehicleId, authUserId } = {}) {
    const leg = state.legs.get(legId);
    const driver = state.drivers.get(driverId);
    if (!driver) return { ok: false, error: 'no_driver' };
    if (!authUserId || authUserId !== driver.authUserId) {
      return { ok: false, error: 'auth' };
    }
    if (!bookingReady(leg)) return { ok: false, error: 'booking' };
    if (leg.status !== 'PENDING' || leg.assigned) return { ok: false, error: 'taken' };
    if (!waveAllows(legId, driverId)) return { ok: false, error: 'reserved' };
    if (vehicleId) {
      if (!selectedVehicleOk(driverId, vehicleId, leg)) {
        return { ok: false, error: 'vehicle' };
      }
    } else if (!vehicleOk(driverId, leg)) {
      return { ok: false, error: 'vehicle' };
    }
    if (leg.assigned) return { ok: false, error: 'taken' };
    leg.assigned = driverId;
    leg.assignedVehicle = vehicleId ?? null;
    leg.status = 'ASSIGNED';
    const run = state.runs.get(legId);
    if (run) run.status = 'accepted';
    return { ok: true };
  }

  function markProviderAccepted(legId, driverId) {
    const n = state.notifications.find((x) => x.legId === legId && x.driverId === driverId);
    if (!n) return false;
    n.status = 'delivered';
    n.delivery = 'provider_accepted';
    return true;
  }

  function markFailedRetryable(legId, driverId) {
    const n = state.notifications.find((x) => x.legId === legId && x.driverId === driverId);
    if (!n) return false;
    n.status = 'failed_retryable';
    n.delivery = 'failed_retryable';
    n.retryAt = state.clock.now;
    return true;
  }

  function retryFailed(legId, driverId) {
    const n = state.notifications.find((x) => x.legId === legId && x.driverId === driverId);
    if (!n || n.status !== 'failed_retryable') return { ok: false };
    // Same event — no second enqueue key
    const before = state.notifications.filter((x) => x.legId === legId && x.driverId === driverId).length;
    n.status = 'delivered';
    n.delivery = 'provider_accepted';
    const after = state.notifications.filter((x) => x.legId === legId && x.driverId === driverId).length;
    return { ok: true, events: after, sameEvent: before === after && before === 1 };
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
    if (!bookingReady(leg)) return false;
    if (!vehicleOk(driverId, leg)) return false;
    return waveAllows(legId, driverId);
  }

  return {
    state,
    addDriver(id, org, vehicles, authUserId = `auth-${id}`) {
      state.drivers.set(id, {
        org,
        authUserId,
        vehicles: vehicles.map((v, i) => ({
          id: v.id ?? `${id}-v${i}`,
          category: v.category,
          model: v.model ?? null,
          canReceive: v.canReceive !== false,
        })),
      });
    },
    addPremium(id) {
      state.premium.add(id);
    },
    addBooking(id, { status = 'CONFIRMED', paymentSucceeded = true, deleted = false } = {}) {
      state.bookings.set(id, { status, paymentSucceeded, deleted });
    },
    addLeg(id, { org = ORG, bookingId = 'bk1', category, model = null } = {}) {
      if (!state.bookings.has(bookingId)) {
        state.bookings.set(bookingId, {
          status: 'CONFIRMED',
          paymentSucceeded: true,
          deleted: false,
        });
      }
      state.legs.set(id, {
        org,
        bookingId,
        category,
        model,
        status: 'PENDING',
        assigned: null,
        assignedVehicle: null,
      });
    },
    startDirect,
    startPremium,
    startOpen,
    advanceExpired,
    accept,
    cancel,
    visibleTo,
    markProviderAccepted,
    markFailedRetryable,
    retryFailed,
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

  check('Empty Premium → Open immediately with active run (Option A)', () => {
    const w = createWorld();
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addLeg('L1', { category: 'executive', model: null });
    const r = w.startPremium('L1');
    assert.equal(r.wave, 'open');
    assert.equal(w.state.runs.get('L1').wave, 'open');
    assert.equal(w.state.runs.get('L1').status, 'active');
    assert.deepEqual(
      w.notifies('L1').map((n) => n.driverId),
      ['N1']
    );
  });

  check('After 10 minutes: open to unnotified; Premium no 2nd notify', () => {
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
    assert.equal(w.visibleTo('L1', 'P1'), true);
    assert.equal(w.visibleTo('L1', 'N1'), true);
  });

  check('Open includes Premium added mid-wave who were never notified', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('P_NEW', ORG, [{ category: 'executive', model: null }]);
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addPremium('P1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1');
    // Added to Premium after enqueue — missed Premium push
    w.addPremium('P_NEW');
    w.tick(PREMIUM_WAIT_MS);
    const ids = w.notifies('L1').map((n) => `${n.wave}:${n.driverId}`);
    assert.ok(ids.includes('premium:P1'));
    assert.ok(ids.includes('open:N1'));
    assert.ok(ids.includes('open:P_NEW'));
    assert.ok(!ids.includes('open:P1'));
  });

  check('Accept before expiry → no open wave', () => {
    const w = createWorld();
    w.addDriver('P1', ORG, [{ category: 'executive', model: null }], 'auth-P1');
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }], 'auth-N1');
    w.addPremium('P1');
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1');
    assert.equal(w.accept('L1', 'P1', { authUserId: 'auth-P1' }).ok, true);
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

  check('Concurrent accept with distinct auth → one winner', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: null }], 'auth-A');
    w.addDriver('B', ORG, [{ category: 'executive', model: null }], 'auth-B');
    w.addLeg('L1', { category: 'executive', model: null });
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    const r1 = w.accept('L1', 'A', { authUserId: 'auth-A' });
    const r2 = w.accept('L1', 'B', { authUserId: 'auth-B' });
    assert.equal(r1.ok, true);
    assert.equal(r2.ok, false);
    assert.equal(w.state.legs.get('L1').assigned, 'A');
  });

  check('service-role style accept without auth.uid → rejected', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: null }], 'auth-A');
    w.addLeg('L1', { category: 'executive', model: null });
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    assert.equal(w.accept('L1', 'A', {}).ok, false);
    assert.equal(w.accept('L1', 'A', { authUserId: 'auth-A' }).ok, true);
  });

  check('Selected vehicle must match owner/org/eligibility/model', () => {
    const w = createWorld();
    w.addDriver(
      'A',
      ORG,
      [
        { id: 'v-ok', category: 'executive', model: 'mercedes-e-class', canReceive: true },
        { id: 'v-bad-model', category: 'executive', model: 'bmw-5', canReceive: true },
        { id: 'v-no-jobs', category: 'executive', model: 'mercedes-e-class', canReceive: false },
      ],
      'auth-A'
    );
    w.addDriver(
      'B',
      ORG,
      [{ id: 'v-b', category: 'executive', model: 'mercedes-e-class', canReceive: true }],
      'auth-B'
    );
    w.addLeg('L1', { category: 'executive', model: 'mercedes-e-class' });
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    assert.equal(
      w.accept('L1', 'A', { authUserId: 'auth-A', vehicleId: 'v-bad-model' }).ok,
      false
    );
    assert.equal(
      w.accept('L1', 'A', { authUserId: 'auth-A', vehicleId: 'v-no-jobs' }).ok,
      false
    );
    assert.equal(
      w.accept('L1', 'A', { authUserId: 'auth-A', vehicleId: 'v-b' }).ok,
      false
    );
    assert.equal(
      w.accept('L1', 'A', { authUserId: 'auth-A', vehicleId: 'v-ok' }).ok,
      true
    );
  });

  check('Booking parent must be confirmed + paid', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: null }], 'auth-A');
    w.addBooking('bk-bad', { status: 'PENDING_PAYMENT', paymentSucceeded: false });
    w.addLeg('L1', { bookingId: 'bk-bad', category: 'executive', model: null });
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    assert.equal(w.accept('L1', 'A', { authUserId: 'auth-A' }).ok, false);
    assert.equal(w.visibleTo('L1', 'A'), false);
  });

  check('Wrong org / vehicle → no access', () => {
    const w = createWorld();
    w.addDriver('X', 'other-org', [{ category: 'executive', model: null }]);
    w.addDriver('Y', ORG, [{ category: 'luxury', model: null }]);
    w.addLeg('L1', { category: 'executive', model: null });
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
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
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    assert.equal(w.visibleTo('L1', 'A'), true);
    assert.equal(w.visibleTo('L1', 'B'), true);
  });

  check('Exact model match required when model set', () => {
    const w = createWorld();
    w.addDriver('A', ORG, [{ category: 'executive', model: 'bmw-5' }]);
    w.addDriver('B', ORG, [{ category: 'executive', model: 'mercedes-e-class' }]);
    w.addLeg('L1', { category: 'executive', model: 'mercedes-e-class' });
    w.state.runs.set('L1', {
      wave: 'open',
      status: 'active',
      exclusiveDriverId: null,
      expiresAt: null,
    });
    assert.equal(w.visibleTo('L1', 'A'), false);
    assert.equal(w.visibleTo('L1', 'B'), true);
  });

  check('Retry path: event → provider_accepted / failed_retryable → same event', () => {
    const w = createWorld();
    w.addDriver('N1', ORG, [{ category: 'executive', model: null }]);
    w.addLeg('L1', { category: 'executive', model: null });
    w.startPremium('L1'); // empty premium → open + notify N1
    const created = w.notifies('L1')[0];
    assert.equal(created.status, 'pending'); // event created
    assert.equal(w.markProviderAccepted('L1', 'N1'), true);
    assert.equal(w.notifies('L1')[0].delivery, 'provider_accepted');
    assert.equal(w.markFailedRetryable('L1', 'N1'), true);
    assert.equal(w.notifies('L1')[0].delivery, 'failed_retryable');
    const retry = w.retryFailed('L1', 'N1');
    assert.equal(retry.ok, true);
    assert.equal(retry.sameEvent, true);
    assert.equal(w.notifies('L1').length, 1);
  });

  console.log(`\n${passed} isolated tests passed (no production contact).`);
}

run();
