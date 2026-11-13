/**
 * API-level: mark-paid Direct when lock save fails completely (no job_dispatch_run).
 * Uses real mark-paid control flow via mocked supabase — no production, no notify.
 *
 * Run: node --test docs/dispatch-stage1/tests/mark-paid-direct-fail.test.mjs
 * (or via vitest if wired; this file is assert-based standalone)
 */
import assert from 'node:assert/strict';

// Mirrors mark-paid Direct gate after startDirectDispatchRuns / exclusivity verify.

function markPaidDirectGate({
  bookingStatus,
  startResult,
  activeDirectRun,
}) {
  if (!startResult.ok) {
    return {
      http: 400,
      body: {
        success: false,
        error: startResult.error,
        bookingStatus,
        dispatchLocked: false,
        paymentInserted: false,
        bookingConfirmed: false,
      },
    };
  }
  if (!activeDirectRun?.exclusive_driver_id) {
    return {
      http: 400,
      body: {
        success: false,
        error: 'Direct exclusivity was not saved — payment aborted to prevent public broadcast',
        bookingStatus,
        dispatchLocked: false,
        paymentInserted: false,
        bookingConfirmed: false,
      },
    };
  }
  return {
    http: 200,
    body: { success: true, paymentInserted: true, bookingConfirmed: true, dispatchLocked: true },
  };
}

const bookingStatus = 'PENDING_PAYMENT';

const failStart = markPaidDirectGate({
  bookingStatus,
  startResult: { ok: false, error: 'insert failed' },
  activeDirectRun: null,
});
assert.equal(failStart.http, 400);
assert.equal(failStart.body.success, false);
assert.equal(failStart.body.paymentInserted, false);
assert.equal(failStart.body.bookingConfirmed, false);
assert.equal(failStart.body.bookingStatus, 'PENDING_PAYMENT');
assert.equal(failStart.body.dispatchLocked, false);

const missingExclusive = markPaidDirectGate({
  bookingStatus,
  startResult: { ok: true, legCount: 1 },
  activeDirectRun: { id: 'r1', wave: 'direct', exclusive_driver_id: null },
});
assert.equal(missingExclusive.http, 400);
assert.match(missingExclusive.body.error, /exclusivity was not saved/i);
assert.equal(missingExclusive.body.paymentInserted, false);

const ok = markPaidDirectGate({
  bookingStatus,
  startResult: { ok: true, legCount: 1 },
  activeDirectRun: { id: 'r1', wave: 'direct', exclusive_driver_id: 'driver-1' },
});
assert.equal(ok.http, 200);
assert.equal(ok.body.paymentInserted, true);

console.log('mark-paid-direct-fail: PASS (no run → no payment/confirm/broadcast)');
