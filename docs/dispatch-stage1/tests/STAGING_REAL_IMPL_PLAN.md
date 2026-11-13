# Plan teste — implementare reală (DB izolată + provider fals)

**Interzis:** chei OneSignal/Resend de producție, șoferi reali, push efectiv, apply pe VL NEW.

## Mediu

1. Proiect Supabase **staging** (clone schemă VL NEW, fără date clienți).
2. Worker notificări local / staging cu:
   - `ONESIGNAL_*` → stub (`sendPushToExternalUserId` înregistrează în memorie/fișier)
   - `WORKER_ENABLED=true`, coadă doar pe staging DB
3. Admin pe branch review împotriva staging URL.
4. `waves_enabled_automatic` rămâne **false** pe VL NEW; pe staging poate fi true doar în suite controlate.

## Suite A — SQL pe staging (după apply migrări Stage1 pe staging)

| # | Test | Cum |
|---|------|-----|
| A1 | Accept concurrent autentificat | Vezi `staging-concurrent-accept.auth.sql` — **2 JWT / 2 auth.uid()** distincte; **NU** 2× service-role |
| A2 | Impersonare | Caller auth=A trimite `p_driver_id=B` → reject |
| A3 | Vehicle_id exact | Mașină alt driver / alt org / model greșit / `can_receive_jobs=false` → reject |
| A4 | Booking părinte | Booking `deleted` / nu `CONFIRMED` / fără plată `succeeded` → reject |
| A5 | Wave Direct | Run active exclusive=A; B accept → fail; A accept → ok |
| A6 | Wave Premium | Doar premium+vehicul în `notification_events` |
| A7 | Open după timer | `advance_expired…` (service_role / cron role); Open pentru ne-notificați, **inclusiv** Premium adăugat între timp |
| A8 | Empty Premium → Open | `start_premium_dispatch_run` → `wave=open`, run activ, notify eligibili |
| A9 | Idempotency | Re-enqueue același key → 0 rânduri noi |
| A10 | Retry path | Vezi §Retry — event creat ≠ provider_accepted ≠ failed_retryable; retry pe același event |
| A11 | Auth pe enqueue/start/advance | `authenticated` random fără org → deny; `anon` → deny; service_role/cron → ok |
| A12 | Org filter view | Driver alt org nu vede oferta |

### A1 — concurență cu identități reale (obligatoriu)

Două apeluri `service_role` **fără** `auth.uid()` sunt respinse de `driver_accept_job` (`Authentication required`) și **nu** demonstrează cursa între doi șoferi.

Folosește `tests/staging-concurrent-accept.auth.sql`:

1. Creează drivers A/B cu `auth_user_id` distincte pe staging.
2. În sesiunea 1: `SELECT set_config('request.jwt.claim.sub', '<auth_a>', true);` + `SET LOCAL ROLE authenticated;` + `SELECT driver_accept_job(leg);`
3. În sesiunea 2: același pattern cu `<auth_b>`.
4. Exact 1 success, 1 fail (`Job not available` / `false`).

## Suite B — Worker mock (retry real)

| # | Test | Expect |
|---|------|--------|
| B1 | Event cu `driver_id` | 1 send mock → delivery `provider_accepted` |
| B2 | Event Open per-driver | N sends = N events |
| B3 | Retry | Marchează event/delivery `failed_retryable` + `next_retry_at<=now()`; worker `getPendingEvents` re-claim pe **același** `event.id`; **nu** INSERT event nou |

### Calea reală de retry (cod worker main)

1. **Event creat:** `notification_events.status='pending'` (enqueue).
2. **Claim:** `claimEventForProcessing` → `processing` (doar din `pending|ready|failed_retryable`).
3. **Provider acceptat:** `markDeliveryProviderAccepted` → delivery `provider_accepted` + `provider_message_id`.
4. **Livrare eșuată retryable:** `markDeliveryFailedRetryable` + `markEventFailedRetryable` → `failed_retryable`, `next_retry_at`, `retry_count++`.
5. **Retry:** `getPendingEvents` include `failed_retryable` cu `next_retry_at <= now`; **același** idempotency_key; fără al doilea event.
6. Notă: `RetryWorker.runOnce` pe main e încă stub; retry-ul real trece prin polling pe events `failed_retryable`.

## Suite C — Admin UI pe staging

| # | Test |
|---|------|
| C1 | Direct fără șofer → blocat |
| C2 | Direct + mark paid → 1 event + 1 mock push |
| C3 | Release Premium → doar premium |
| C4 | Open now → ne-notificați (Premium nou inclus) |
| C5 | Empty Premium release/start → Open imediat, run activ |

## Criteriu GO / NO-GO

- A1–A12 verzi pe staging (A1 cu auth distinct)  
- B1–B3 verzi  
- Nicio livrare OneSignal reală în loguri  
- `waves_enabled_automatic=false` pe VL NEW  
- Fără merge/apply/deploy pe producție din acest plan
