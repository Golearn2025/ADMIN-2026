# Worker offerability guard — implementare pe review

**Repo backend:** `Golearn2025/Back-End-Notification-OneSignal-Resend-2026`  
**Branch review:** `review/dispatch-offerability-guard` (din `origin/main` @ `6502611`)

## Cod

1. `process-driver-job-available.handler.ts`
   - skip dacă `event.status === 'cancelled'`
   - înainte de send (inclusiv retry / `processing`): `db.rpc('job_leg_is_offerable', { p_booking_leg_id })`
   - dacă false → `markEventCancelled(..., 'job_not_offerable')`, **fără** OneSignal
2. `notification-events.repository.ts` → `markEventCancelled`

## Teste (provider fals / mocks)

`tests/notifications/process-driver-job-available.offerability.test.ts`

- job acceptat/anulat (`offerable=false`) → cancel, zero send  
- event deja `cancelled` → skip  
- `status=processing` + ne-offerable → cancel  
- `failed_retryable` + offerable → send mock OK  

**Dependență DB:** RPC `job_leg_is_offerable` din migrarea Admin Stage1 `600` (neaplicată pe VL NEW încă).

## NU

- merge pe main backend  
- deploy Render  
- notificări reale  
