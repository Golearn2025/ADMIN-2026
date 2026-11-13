# Open wave + calea reală de retry (fără notificări reale)

## Open — cine primește event

După Stage1 review (`enqueue_dispatch_wave_notifications(...,'open')`):

1. Șoferi din **aceeași organizație**, `approved`, cu vehicul eligibil (model/categorie leg).
2. **Exclude** doar pe cei care au deja `notification_events` pe `(job_id, driver_id)` cu status ≠ `cancelled`.
3. **Include** șoferii adăugați pe Premium **după** enqueue-ul Premium (au ratat push-ul Premium).
4. **Nu** re-notifică Premium care au primit deja Premium event.
5. Direct rămâne exclusiv (nu trece prin acest Open fan-out).

Idempotency: `driver_job_available:wave:open:{org}:{leg}:{driver}` + `ON CONFLICT DO NOTHING`.

## Distincții de stare (obligatorii)

| Stare | Unde | Semnificație |
|-------|------|----------------|
| Event creat | `notification_events.status = pending` | Rând inserat; worker încă nu a claim-uit |
| Provider acceptat | `notification_deliveries.status = provider_accepted` + `provider_message_id` | OneSignal/Resend a acceptat request-ul |
| Livrare eșuată retryable | delivery + event `failed_retryable`, `next_retry_at` set | Eșec temporar; nu e dead-letter |

Dovezi pe VL NEW (read-only, 2026-11-12): deliveries `provider_accepted` și `failed_retryable` există în volum real pe proiect — schema e folosită.

## Calea reală de retry (cod GitHub backend main)

Fișiere:

- `notification-events.repository.ts` → `getPendingEvents` include `failed_retryable` cu `next_retry_at <= now`
- `claimEventForProcessing` re-claim pe **același** `event.id` din `pending|ready|failed_retryable`
- `markEventFailedRetryable` / `markDeliveryFailedRetryable` incrementează `retry_count` / `attempt_no`
- `RetryWorker.runOnce` pe main este încă **stub** — retry-ul operațional trece prin **polling** pe events, nu prin worker-ul stub

### Demonstrație pe staging (mock provider)

```text
1. INSERT event (enqueue Open)           → event.status = pending          [CREAT]
2. Worker claim + mock send OK           → delivery = provider_accepted    [PROVIDER]
3. Simulează eșec provider               → event+delivery = failed_retryable, next_retry_at=now()
4. Worker getPendingEvents + claim again → SAME event.id, SAME idempotency_key
5. Assert: count(events where job_id=X and driver_id=Y) = 1
```

**Interzis pe producție:** forțarea failed_retryable pe evenimente live / trimiteri OneSignal reale.
